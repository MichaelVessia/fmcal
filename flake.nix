{
  description = "fmcal - Fastmail Calendar CLI";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = {
    self,
    nixpkgs,
    flake-utils,
  }:
    flake-utils.lib.eachDefaultSystem (system: let
      pkgs = nixpkgs.legacyPackages.${system};
    in {
      devShells.default = pkgs.mkShell {
        buildInputs = with pkgs; [
          bun
          typescript
        ];

        shellHook = ''
          echo "fmcal dev shell"
          echo "Commands:"
          echo "  bun install    - Install dependencies"
          echo "  bun run dev    - Run CLI in dev mode"
          echo "  bun run build  - Build executable"
        '';
      };
    });
}
