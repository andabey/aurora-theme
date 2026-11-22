# Aurora theme

An animated theme for the Claude desktop app. In dark mode, northern lights ripple over a starry night sky with twinkling and shooting stars and rising fireflies. In light mode, a pastel dawn has drifting clouds, soft colour glows and rising bubbles. Faint lines of Luau code scroll slowly down the sky, the whole scene sways like water, a soft violet glow follows your pointer, and every click sends out a ring. Messages sit on glowing rounded cards so they stay easy to read.

## Install

At the prompt of a Claude Code session in a terminal:

```
/plugin install aurora-theme --marketplace andabey/aurora-theme
```

Answer `y` to add the marketplace, then pick the user scope.

Or from a shell:

```
claude plugin install aurora-theme --marketplace andabey/aurora-theme
```

In the desktop app, where `/plugin` does not run: click + next to the prompt box, then Plugins, Add marketplace with `andabey/aurora-theme`, then Add plugin.

Restart the Claude app afterwards so every chat picks the theme up.

## Notes

- The moving sky is drawn on the GPU at 60 fps and needs a reasonably fast graphics card. On a slower one, or with animations turned off in Windows, you see a calm still page of code instead.
- In dark mode the accent fill is white so the usage ring stands out.
