export const PANEL_MOTION = {
  initial: { opacity: 0, scale: 0.92, filter: "blur(4px)" },
  animate: {
    opacity: 1,
    scale: 1,
    filter: "blur(0px)",
    transition: {
      type: "spring",
      visualDuration: 0.38,
      bounce: 0.18,
      opacity: { duration: 0.2, ease: "easeOut" },
      filter: { duration: 0.25, ease: "easeOut" },
    },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    filter: "blur(2px)",
    transition: { duration: 0.16, ease: [0.4, 0, 1, 1] },
  },
} as const

export const PANEL_FADE = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.12 } },
} as const

export const BACKDROP_MOTION = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.25, ease: "easeOut" } },
  exit: { opacity: 0, transition: { duration: 0.18, ease: "easeIn" } },
} as const
