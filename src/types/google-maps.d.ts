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
          setBounds(bounds?: any): void;
          setStrictBounds(strictBounds: boolean): void;
        }

        const Autocomplete: {
          new (inputField: HTMLInputElement, options?: AutocompleteOptions): Autocomplete;
        };
      }

      interface GeocoderRequest {
        address?: string;
        location?: { lat: number; lng: number };
        bounds?: any;
        componentRestrictions?: { country?: string | string[] };
      }

      interface GeocoderResult {
        geometry?: {
          location?: {
            lat(): number;
            lng(): number;
          };
          viewport?: any;
        };
      }

      interface Geocoder {
        geocode(request: GeocoderRequest, callback: (results: GeocoderResult[], status: string) => void): void;
      }

      const Geocoder: {
        new (): Geocoder;
      };
    }
  }

  var google: typeof google;
}

export {};
