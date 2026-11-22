import type { Register, ThemeColors, ThemeSetArgs, ThemeStyle } from 'claude-code'

import { makeColors } from './make-colors.js'
import { SCENE } from './scene'

// Aurora: indigo night with drifting northern lights, or a soft pastel dawn by day.
const { theme, problems } = makeColors({
  label: 'Aurora',
  roles: { accent: '#7c5cff', danger: '#e5484d', success: '#22b07d', warning: '#d99a1e', pro: '#c25fd6' },
  light: {
    gray: {
      anchors: {
        'surface-0': '#ebe8f7',
        'surface-1': '#f2f0fb',
        'surface-2': '#f9f8fe',
        'text-primary': '#1b1933',
        'text-secondary': '#433f69',
        'text-muted': '#5b5780',
      },
    },
  },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#0d0e1f',
        'surface-1': '#141629',
        'surface-2': '#1a1d34',
        'surface-3': '#20233c',
        'text-primary': '#eef0ff',
        'text-secondary': '#c3c7e8',
        'text-muted': '#9a9fc6',
      },
    },
  },
})

const colors: ThemeColors = {
  ...theme,
  inputs: {
    light: {
      ...theme.inputs.light,
      'bg-user-message': '#e2d9ff',
      'text-user-message': '#1d1642',
      'bg-assistant-message': '#fbfaff',
      'text-assistant-message': '#1b1933',
    },
    dark: {
      ...theme.inputs.dark,
      // White accent fill at night, so the usage ring stands out on the navy sky.
      'role-accent-fill': '#f4f2ff',
      'role-accent-fill-hover': '#ffffff',
      'role-accent-on': '#0d0e1f',
      'bg-user-message': '#2b2560',
      'text-user-message': '#f4f1ff',
      'bg-assistant-message': '#12142a',
      'text-assistant-message': '#eef0ff',
    },
  },
}

const style: ThemeStyle = {
  Heading: { color: 'text-accent' },
  UserMessage: {
    backgroundColor: 'bg-user-message',
    color: 'text-user-message',
    radius: 18,
    paddingX: 16,
    paddingY: 12,
    shadow: { y: 6, blur: 22, color: '#7c5cff44' },
  },
  AssistantMessage: {
    backgroundColor: 'bg-assistant-message',
    color: 'text-assistant-message',
    radius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'border',
    shadow: { y: 4, blur: 18, color: '#00000030' },
  },
  ToolUse: { backgroundColor: 'surface-1', radius: 10, paddingX: 10, paddingY: 4 },
}

const BASE: ThemeSetArgs = {
  colors,
  backdrop: { scene: 'aurora', glass: { blur: 22, opacity: 0.55 } },
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const unpainted = problems.find(line => line.startsWith("Desktop won't paint"))

    if (unpainted !== undefined) {
      $.ui.toast(unpainted)
    }

    let set

    try {
      set = await $.theme.set({ ...BASE, style })
    } catch (error) {
      $.ui.log(String(error))
      set = await $.theme.set(BASE)
    }

    if (!set.isDrawn) {
      $.ui.status(set.reason)
    }

    return next(e)
  })

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    if ((e.surface !== 'desktop' && e.surface !== 'mobile') || e.props.scene !== 'aurora') {
      return next(e)
    }

    const { Shader, Svg } = $.ui.resolve(e)

    return (
      <Shader module="./aurora-shader.ts">
        <Svg source={SCENE} alt="Northern lights and faint lines of code over a starry night sky, or soft pastel clouds at dawn" />
      </Shader>
    )
  })
}
