import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { finalize } from 'rxjs';
import { AgreementService } from '../../../../../services/agreement/agreement-service';
import { Modal } from '../../../../../shared/components/ui/modal/modal';
import { Pagination } from '../../../../../shared/components/ui/pagination/pagination';
import { PaginationMeta } from '../../../../../services/api/api-response.model';
import {
  AgreementClause,
  AgreementTemplateItem,
  AgreementTemplateStatus,
  AgreementTemplateType,
  DEFAULT_AGREEMENT_CLAUSES,
} from '../../../../../core/models/agreement-template.model';

@Component({
  selector: 'app-agreement-template',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, Modal, Pagination],
  templateUrl: './agreement-template.component.html',
})
export class AgreementTemplateComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly agreementService = inject(AgreementService);
  private readonly sanitizer = inject(DomSanitizer);

  // Data state
  public readonly templates = signal<AgreementTemplateItem[]>([]);
  public readonly isLoading = signal<boolean>(false);
  public readonly isSaving = signal<boolean>(false);
  public readonly successMessage = signal<string | null>(null);
  public readonly errorMessage = signal<string | null>(null);

  // Pagination
  public readonly currentPage = signal<number>(1);
  public readonly pageSize = signal<number>(10);
  public readonly totalItems = signal<number>(0);
  public meta: PaginationMeta = {
    page: 1,
    size: 10,
    total: 0,
  };
  public readonly pageSizeOptions = [10, 20, 50];

  // Filters & Search
  public readonly searchFilter = signal<string>('');
  public readonly statusFilter = signal<string>('');

  // Create / Edit Modal state
  public readonly isEditorModalOpen = signal<boolean>(false);
  public readonly editingTemplate = signal<AgreementTemplateItem | null>(null);
  public readonly selectedMode = signal<AgreementTemplateType>('rich_text');
  public readonly selectedPdfFile = signal<File | null>(null);
  public readonly pdfFileName = signal<string | null>(null);
  public readonly pdfFileError = signal<string | null>(null);

  // Preview Modal state
  public readonly isPreviewModalOpen = signal<boolean>(false);
  public readonly previewTemplateItem = signal<AgreementTemplateItem | null>(null);
  public readonly previewClauses = signal<AgreementClause[]>([]);
  public readonly previewPdfUrl = signal<SafeResourceUrl | null>(null);
  public readonly isPreviewLoading = signal<boolean>(false);

  // Confirmation Modal state
  public readonly isConfirmModalOpen = signal<boolean>(false);
  public readonly confirmAction = signal<'set_default' | 'archive' | null>(null);
  public readonly targetTemplate = signal<AgreementTemplateItem | null>(null);
  public readonly isActionProcessing = signal<boolean>(false);

  // Template Form
  public readonly templateForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    version: ['1.0', [Validators.required]],
    description: [''],
    status: ['active', [Validators.required]],
    clauses: this.fb.array([]),
  });

  get clauses(): FormArray {
    return this.templateForm.get('clauses') as FormArray;
  }

  ngOnInit(): void {
    this.loadTemplates();
  }

  public loadTemplates(): void {
    this.isLoading.set(true);
    this.agreementService
      .getAgreementTemplates({
        page: this.currentPage(),
        size: this.pageSize(),
        status: this.statusFilter() || undefined,
        search: this.searchFilter() || undefined,
      })
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (res) => {
          this.templates.set(res?.data || []);
          const total = res.meta?.total ?? (res?.data ? res.data.length : 0);
          this.totalItems.set(total);
          this.meta = {
            page: res.meta?.page || this.currentPage(),
            size: res.meta?.size || res.meta?.limit || this.pageSize(),
            total: total,
          };
        },
        error: (err) => {
          const msg = this.agreementService.extractApiErrorMessage(err) || 'Failed to load agreement templates.';
          this.errorMessage.set(msg);
        },
      });
  }

  public onSearchChange(term: string): void {
    this.searchFilter.set(term);
    this.currentPage.set(1);
    this.loadTemplates();
  }

  public onStatusChange(status: string): void {
    this.statusFilter.set(status);
    this.currentPage.set(1);
    this.loadTemplates();
  }

  public onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadTemplates();
  }

  public onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
    this.loadTemplates();
  }

  // ── Create / Edit Modal Handlers ──────────────────────────────────────────

  public openCreateModal(): void {
    this.editingTemplate.set(null);
    this.selectedMode.set('rich_text');
    this.selectedPdfFile.set(null);
    this.pdfFileName.set(null);
    this.pdfFileError.set(null);

    this.templateForm.reset({
      name: '',
      version: '1.0',
      description: '',
      status: 'active',
    });

    this.clauses.clear();
    for (const clause of DEFAULT_AGREEMENT_CLAUSES) {
      this.clauses.push(this.createClauseGroup(clause));
    }

    this.isEditorModalOpen.set(true);
  }

  public openEditModal(template: AgreementTemplateItem): void {
    this.editingTemplate.set(template);
    this.selectedMode.set(template.template_type);
    this.selectedPdfFile.set(null);
    this.pdfFileName.set(template.pdf_file_key ? 'Current uploaded PDF' : null);
    this.pdfFileError.set(null);

    this.templateForm.patchValue({
      name: template.name,
      version: template.version || '1.0',
      description: template.description || '',
      status: template.status || 'active',
    });

    this.clauses.clear();
    let clausesData: AgreementClause[] = [];
    if (template.content_json) {
      try {
        const parsed = JSON.parse(template.content_json);
        if (Array.isArray(parsed)) {
          clausesData = parsed;
        }
      } catch {
        clausesData = [];
      }
    }
    if (clausesData.length === 0 && template.template_type === 'rich_text') {
      clausesData = [...DEFAULT_AGREEMENT_CLAUSES];
    }
    for (const clause of clausesData) {
      this.clauses.push(this.createClauseGroup(clause));
    }

    this.isEditorModalOpen.set(true);
  }

  public closeEditorModal(): void {
    this.isEditorModalOpen.set(false);
    this.editingTemplate.set(null);
    this.selectedPdfFile.set(null);
    this.pdfFileName.set(null);
    this.pdfFileError.set(null);
  }

  public setMode(mode: AgreementTemplateType): void {
    this.selectedMode.set(mode);
    if (mode === 'rich_text' && this.clauses.length === 0) {
      for (const clause of DEFAULT_AGREEMENT_CLAUSES) {
        this.clauses.push(this.createClauseGroup(clause));
      }
    }
  }

  public onPdfFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      this.pdfFileError.set('Only valid PDF documents (.pdf) are permitted.');
      this.selectedPdfFile.set(null);
      this.pdfFileName.set(null);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      this.pdfFileError.set('PDF file size must not exceed 10 MB.');
      this.selectedPdfFile.set(null);
      this.pdfFileName.set(null);
      return;
    }

    this.pdfFileError.set(null);
    this.selectedPdfFile.set(file);
    this.pdfFileName.set(file.name);
  }

  public createClauseGroup(clause: Partial<AgreementClause> = {}): FormGroup {
    const textContent = clause.content || clause.body || '';
    return this.fb.group({
      heading: [clause.heading || '', [Validators.required]],
      content: [textContent, [Validators.required]],
    });
  }

  public addClause(): void {
    const nextNumber = this.clauses.length + 1;
    this.clauses.push(
      this.createClauseGroup({
        heading: `${nextNumber}. Special Covenant / Clause`,
        content: '',
      })
    );
  }

  public removeClause(index: number): void {
    if (this.clauses.length > 1) {
      this.clauses.removeAt(index);
    }
  }

  public saveTemplate(): void {
    if (this.templateForm.invalid) {
      this.templateForm.markAllAsTouched();
      return;
    }

    const mode = this.selectedMode();
    const isEdit = !!this.editingTemplate();
    const templateId = this.editingTemplate()?.id;

    if (mode === 'pdf_upload' && !isEdit && !this.selectedPdfFile()) {
      this.pdfFileError.set('Please select a PDF document to upload.');
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const formValues = this.templateForm.value;

    let contentJson: string | undefined = undefined;
    if (mode === 'rich_text') {
      const clausesList = this.clauses.controls.map((ctrl) => ({
        heading: ctrl.get('heading')?.value,
        body: ctrl.get('content')?.value,
      }));
      contentJson = JSON.stringify(clausesList);
    }

    // Build payload: use FormData if uploading PDF, else JSON
    const pdfFile = this.selectedPdfFile();
    let payload: any;

    if (pdfFile) {
      const fd = new FormData();
      fd.append('name', formValues.name);
      fd.append('version', formValues.version || '1.0');
      fd.append('description', formValues.description || '');
      fd.append('template_type', mode);
      fd.append('status', formValues.status || 'active');
      fd.append('pdf_file', pdfFile);
      if (contentJson) {
        fd.append('content_json', contentJson);
      }
      payload = fd;
    } else {
      payload = {
        name: formValues.name,
        version: formValues.version || '1.0',
        description: formValues.description || undefined,
        template_type: mode,
        status: formValues.status || 'active',
        content_json: contentJson,
      };
    }

    const request$ = isEdit
      ? this.agreementService.updateAgreementTemplate(templateId!, payload)
      : this.agreementService.createAgreementTemplate(payload);

    request$.pipe(finalize(() => this.isSaving.set(false))).subscribe({
      next: (res) => {
        this.successMessage.set(
          isEdit ? 'Agreement template updated successfully!' : 'Agreement template created successfully!'
        );
        this.closeEditorModal();
        this.loadTemplates();
      },
      error: (err) => {
        const msg = this.agreementService.extractApiErrorMessage(err) || 'Failed to save agreement template.';
        this.errorMessage.set(msg);
      },
    });
  }

  // ── Preview Handlers ──────────────────────────────────────────────────────

  public openPreview(template: AgreementTemplateItem): void {
    this.previewTemplateItem.set(template);
    this.previewClauses.set([]);
    this.previewPdfUrl.set(null);
    this.isPreviewModalOpen.set(true);
    this.isPreviewLoading.set(true);

    this.agreementService
      .previewAgreementTemplate(template.id)
      .pipe(finalize(() => this.isPreviewLoading.set(false)))
      .subscribe({
        next: (data) => {
          if (data?.template_type === 'pdf_upload' || data?.pdf_url) {
            const rawUrl = data.pdf_url || template.pdf_url;
            if (rawUrl) {
              this.previewPdfUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(rawUrl));
            }
          } else if (data?.clauses && Array.isArray(data.clauses)) {
            const parsed = data.clauses.map((c: any) => ({
              heading: c.heading || '',
              content: c.body || c.content || '',
            }));
            this.previewClauses.set(parsed);
          } else if (template.content_json) {
            try {
              const clauses = JSON.parse(template.content_json);
              this.previewClauses.set(clauses);
            } catch {
              this.previewClauses.set([]);
            }
          }
        },
        error: () => {
          // Fallback to template's existing content_json
          if (template.content_json) {
            try {
              const clauses = JSON.parse(template.content_json);
              this.previewClauses.set(clauses);
            } catch {
              this.previewClauses.set([]);
            }
          }
        },
      });
  }

  public closePreviewModal(): void {
    this.isPreviewModalOpen.set(false);
    this.previewTemplateItem.set(null);
    this.previewClauses.set([]);
    this.previewPdfUrl.set(null);
  }

  // ── Set Default / Archive Handlers ────────────────────────────────────────

  public confirmSetDefault(template: AgreementTemplateItem): void {
    this.targetTemplate.set(template);
    this.confirmAction.set('set_default');
    this.isConfirmModalOpen.set(true);
  }

  public confirmArchive(template: AgreementTemplateItem): void {
    this.targetTemplate.set(template);
    this.confirmAction.set('archive');
    this.isConfirmModalOpen.set(true);
  }

  public closeConfirmModal(): void {
    this.isConfirmModalOpen.set(false);
    this.targetTemplate.set(null);
    this.confirmAction.set(null);
  }

  public executeConfirmedAction(): void {
    const template = this.targetTemplate();
    const action = this.confirmAction();
    if (!template || !action) return;

    this.isActionProcessing.set(true);
    this.errorMessage.set(null);

    const request$ =
      action === 'set_default'
        ? this.agreementService.setDefaultAgreementTemplate(template.id)
        : this.agreementService.archiveAgreementTemplate(template.id);

    request$.pipe(finalize(() => this.isActionProcessing.set(false))).subscribe({
      next: () => {
        this.successMessage.set(
          action === 'set_default'
            ? `"${template.name}" is now the active default agreement template.`
            : `"${template.name}" has been archived successfully.`
        );
        this.closeConfirmModal();
        this.loadTemplates();
      },
      error: (err) => {
        const msg = this.agreementService.extractApiErrorMessage(err) || 'Action failed. Please retry.';
        this.errorMessage.set(msg);
        this.closeConfirmModal();
      },
    });
  }
}
