{
  description = "fmcal - Fastmail Calendar CLI";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    bun2nix = {
      url = "github:nix-community/bun2nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = {
    self,
    nixpkgs,
    flake-utils,
    bun2nix,
  }:
    flake-utils.lib.eachDefaultSystem (system: let
      pkgs = nixpkgs.legacyPackages.${system};
      bun2nix' = bun2nix.packages.${system}.default;
    in {
      packages.default = pkgs.stdenv.mkDerivation {
        pname = "fmcal";
        version = "0.1.0";
        src = ./.;

        nativeBuildInputs = [
          bun2nix'.hook
          pkgs.makeBinaryWrapper
        ];

        bunDeps = bun2nix'.fetchBunDeps {
          bunNix = ./bun.nix;
        };

        # Skip default bun build - we'll run with bun interpreter
        dontUseBunBuild = true;
        dontUseBunCheck = true;
        dontUseBunInstall = true;

        installPhase = ''
          runHook preInstall

          mkdir -p $out/lib/fmcal
          cp -r . $out/lib/fmcal

          mkdir -p $out/bin
          makeBinaryWrapper ${pkgs.bun}/bin/bun $out/bin/fmcal \
            --add-flags "run $out/lib/fmcal/src/main.ts"

          runHook postInstall
        '';
      };

      devShells.default = pkgs.mkShell {
        buildInputs = with pkgs; [
          bun
          lefthook
          typescript
          bun2nix'
        ];

        shellHook = ''
          echo "fmcal dev shell"
          echo "Commands:"
          echo "  bun install    - Install dependencies"
          echo "  bun run dev    - Run CLI in dev mode"
          echo "  bun run build  - Build executable"
          echo "  bun2nix        - Generate bun.nix for packaging"
        '';
      };
    });
}
