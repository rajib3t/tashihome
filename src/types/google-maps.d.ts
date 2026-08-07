declare global {
  var google: {
    maps: {
      places: {
        PlaceAutocompleteElement: {
          new (): HTMLElement & {
            addEventListener(
              event: 'gmp-placeselect',
              handler: (event: { place: any }) => void
            ): void;
          };
        };
      };
    };
  };
}

export {};
