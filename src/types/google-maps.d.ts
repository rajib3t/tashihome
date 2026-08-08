declare global {
  namespace google {
    namespace maps {
      namespace places {
        interface AutocompleteOptions {
          types?: string[];
          fields?: string[];
          componentRestrictions?: { country: string | string[] };
          bounds?: any;
          strictBounds?: boolean;
        }

        interface Autocomplete {
          addListener(eventName: string, handler: () => void): void;
          getPlace(): {
            geometry?: {
              location?: {
                lat(): number;
                lng(): number;
              };
            };
          };
        }

        const Autocomplete: {
          new (inputField: HTMLInputElement, options?: AutocompleteOptions): Autocomplete;
        };
      }
    }
  }

  var google: typeof google;
}

export {};
