# TODO

Open items for this repo.

## Sprite Viewer
- [x] Support `crowd.anim`: on NHL 92 each frame is drawn over the rink's crowd area (`Nhl92Anim.crowdOnRink`, `Sprite-Viewer/test-crowd.js`).
- [ ] Support NHL 95 PC `f*.ppv` files. The code already reads them (`lib/pc95.js`: Bank → Rink and crowd opens `F000_049.PPV`, `F050_099.PPV`, `F100_149.PPV`, `F000_149.PPV`), but it has not been checked on retail files: the NHL 95 PC game files are not on the build box or in the private repo. Needs the retail `F*.PPV` files in `Sprite-Viewer/pc95/`.
- [ ] Fix the off palette on the crowd bench players for 95 PC. Blocked on the same retail files (needed to render and compare). The rink bank uses the game palette (`rinkpal` + team colours); the bench players probably need the team `createPal` instead (a guess until rendered).

## NHL94 decompressor
See `NHL94-Decompressor-Status.md`, "Next Steps": refine the extended commands ($A0-$EF), test full .map.jim files, connect to the image pipeline, optimize for larger files, document the assembly-to-code mapping.
