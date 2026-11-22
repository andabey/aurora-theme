// The picture under the shader: a flat ground with faint lines of code on it.
// The shader paints the sky itself and uses this picture only for the code,
// which it scrolls down endlessly. Shown alone, it is a calm page of code.

const f = (v: number): string => v.toFixed(1)

const BLOCKS: { x: number; y: number; lines: string[] }[] = [
  {
    x: 420,
    y: 60,
    lines: [
      'local Players = game:GetService("Players")',
      'local RunService = game:GetService("RunService")',
      '',
      'local function onPlayerAdded(player)',
      '    local stats = Instance.new("Folder")',
      '    stats.Name = "leaderstats"',
      '    stats.Parent = player',
      'end',
    ],
  },
  {
    x: 40,
    y: 150,
    lines: ['local remote = Remotes.Collect', 'remote.OnServerEvent:Connect(function(plr, id)', '    if not Cooldown:ready(plr) then return end', '    Inventory.add(plr, id, 1)', 'end)'],
  },
  {
    x: 900,
    y: 250,
    lines: [
      'function Aurora.new(sky)',
      '    local self = setmetatable({}, Aurora)',
      '    self.waves = 3',
      '    self.speed = 0.25',
      '    return self',
      'end',
    ],
  },
  {
    x: 430,
    y: 440,
    lines: [
      'RunService.Heartbeat:Connect(function(dt)',
      '    for _, wave in ipairs(waves) do',
      '        wave.phase += dt * wave.speed',
      '        wave.part.CFrame = wave.origin',
      '            * CFrame.new(0, math.sin(wave.phase), 0)',
      '    end',
      'end)',
    ],
  },
  {
    x: 1250,
    y: 470,
    lines: ['while true do', '    task.wait(0.5)', '    sky.Hue = (sky.Hue + 1) % 360', 'end'],
  },
  {
    x: 60,
    y: 640,
    lines: ['local DataStore = DataStoreService:GetDataStore("Saves")', 'local ok, data = pcall(function()', '    return DataStore:GetAsync(key)', 'end)'],
  },
  {
    x: 880,
    y: 660,
    lines: [
      'export type Theme = {',
      '    name: string,',
      '    glow: number,',
      '    colors: { Color3 },',
      '}',
      'local theme: Theme = Themes.Aurora',
    ],
  },
  {
    x: 470,
    y: 830,
    lines: ['local tween = TweenService:Create(part, info, {', '    Transparency = 0.4,', '    Size = Vector3.new(4, 1, 4),', '})', 'tween:Play()'],
  },
]

const KEYWORDS = /^(local|function|end|return|for|in|do|export|type|then|if|not|while|true)$/
const SIZE = 15
const LINE = 23

const escape = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function codeLine(text: string, x: number, y: number): string {
  const indent = text.length - text.trimStart().length
  const parts = text.trimStart().split(/("[^"]*"|\b[A-Za-z_]+\b)/)
  let spans = ''

  for (const part of parts) {
    if (part === '') {
      continue
    }
    const cls = part.startsWith('"') ? 's' : KEYWORDS.test(part) ? 'k' : /^[A-Z]/.test(part) ? 'n' : 'p'
    spans += `<tspan class="${cls}">${escape(part)}</tspan>`
  }

  return `<text x="${f(x + indent * SIZE * 0.6)}" y="${f(y)}">${spans}</text>`
}

function code(): string {
  let out = ''

  for (const block of BLOCKS) {
    block.lines.forEach((line, i) => {
      if (line !== '') {
        out += codeLine(line, block.x, block.y + i * LINE)
      }
    })
  }

  return `<g class="code" font-family="monospace" font-size="${SIZE}">${out}</g>`
}

// The ground colors must stay flat: the shader reads them back to find the code.
const STYLE = `
.ground{fill:#f0ebfa}
.code{opacity:0.32}
.k{fill:#6d28d9}.s{fill:#0f766e}.n{fill:#1d4ed8}.p{fill:#4c1d95}
@media (prefers-color-scheme: dark){
.ground{fill:#0b0c24}
.code{opacity:0.36}
.k{fill:#c4b5fd}.s{fill:#5eead4}.n{fill:#93c5fd}.p{fill:#e0e7ff}
}
`

export const SCENE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice"><style>${STYLE}</style>
<rect class="ground" x="0" y="0" width="1600" height="1000"/>
${code()}
</svg>`
