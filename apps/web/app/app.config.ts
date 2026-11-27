export default defineAppConfig({
  ui: {
    colors: { primary: 'blue', neutral: 'stone' },
    icons: { loading: 'i-lucide-loader-circle' },
    button: {
      slots: {
        base: 'rounded-control font-medium transition-[background,box-shadow,transform,color] duration-[120ms] ease-glot active:translate-y-px active:scale-[.985] disabled:bg-tile disabled:text-ink-4 disabled:shadow-none disabled:ring-0 aria-disabled:bg-tile aria-disabled:text-ink-4',
        leadingIcon: 'size-4',
        trailingIcon: 'size-4',
      },
      variants: {
        size: {
          xs: {
            base: 'h-control-xs gap-[5px] rounded-lg px-[9px] text-xs',
            leadingIcon: 'size-[13px]',
            trailingIcon: 'size-[13px]',
          },
          sm: {
            base: 'h-control-sm gap-1.5 rounded-[9px] px-[11px] text-[13px]',
            leadingIcon: 'size-3.5',
            trailingIcon: 'size-3.5',
          },
          md: { base: 'h-control gap-2 px-3.5 text-sm' },
          lg: { base: 'h-control-lg gap-2 rounded-[13px] px-5 text-[15px]' },
        },
      },
      compoundVariants: [
        {
          color: 'primary',
          variant: ['solid', 'outline'],
          class:
            'text-on-primary shadow-primary [background:var(--glot-primary-fill)] hover:[background:var(--glot-primary-hover)]',
        },
        {
          color: 'neutral',
          variant: 'outline',
          class: 'bg-panel text-ink ring-1 ring-line-2 ring-inset hover:bg-hover hover:ring-line-3',
        },
        {
          color: 'neutral',
          variant: 'ghost',
          class: 'text-ink-2 hover:bg-hover-page hover:text-ink',
        },
        {
          color: 'neutral',
          variant: 'soft',
          class: 'bg-sunken text-ink-2 ring-1 ring-line ring-inset hover:bg-tile hover:text-ink',
        },
        {
          color: 'secondary',
          variant: 'soft',
          class: 'bg-ai-bg text-ai hover:bg-ai-bg hover:ring-1 hover:ring-ai-bar hover:ring-inset',
        },
        {
          color: 'error',
          variant: 'soft',
          class:
            'bg-fix-bg text-fix hover:bg-fix-bg hover:ring-1 hover:ring-fix-bar hover:ring-inset',
        },
      ],
      defaultVariants: { color: 'neutral', variant: 'outline', size: 'md' },
    },
    input: {
      slots: {
        root: 'w-full',
        base: 'rounded-control bg-panel text-ink ring-1 ring-line-2 ring-inset transition-shadow duration-[120ms] placeholder:text-ink-4 hover:ring-line-3 focus-visible:ring-1 focus-visible:ring-sel-ring focus-visible:shadow-[0_0_0_3px_var(--glot-focus-halo)] aria-invalid:ring-fix-bar disabled:bg-tile disabled:text-ink-4 disabled:ring-0',
        leadingIcon: 'size-4 text-ink-3',
      },
      variants: {
        size: {
          sm: { base: 'h-control-sm rounded-[9px] px-2.5 text-[13px]' },
          md: { base: 'h-control px-3 text-sm' },
          lg: { base: 'h-control-lg rounded-[13px] px-3.5 text-[15px]' },
        },
      },
      compoundVariants: [
        {
          variant: 'soft',
          class: { base: 'bg-sunken ring-1 ring-line ring-inset hover:bg-sunken focus:bg-sunken' },
        },
      ],
    },
    textarea: {
      slots: {
        base: 'rounded-control bg-panel px-3 py-2.5 text-[15px] leading-[22px] ring-1 ring-line-2 ring-inset focus-visible:ring-1 focus-visible:ring-sel-ring focus-visible:shadow-[0_0_0_3px_var(--glot-focus-halo)]',
      },
    },
    formField: {
      slots: {
        label: 'text-[13px] font-medium text-ink-2',
        help: 'text-xs text-ink-3',
        error: 'text-xs text-fix',
      },
    },
    badge: {
      slots: {
        base: 'h-6 gap-[5px] rounded-full pr-[9px] pl-[7px] text-[12.5px] font-medium',
        leadingIcon: 'size-[13px]',
      },
      compoundVariants: [
        { color: 'success', variant: 'soft', class: 'bg-ok-bg text-ok' },
        { color: 'info', variant: 'soft', class: 'bg-check-bg text-check' },
        { color: 'error', variant: 'soft', class: 'bg-fix-bg text-fix' },
        { color: 'warning', variant: 'soft', class: 'bg-warn-bg text-warn' },
        { color: 'secondary', variant: 'soft', class: 'bg-ai-bg text-ai' },
        {
          color: 'neutral',
          variant: 'outline',
          class: 'bg-transparent text-miss ring-1 ring-line-2 ring-inset',
        },
        {
          color: 'neutral',
          variant: 'soft',
          class: 'bg-sunken text-ink-2 ring-1 ring-line ring-inset',
        },
      ],
      variants: { size: { lg: { base: 'h-7 pr-3 pl-[9px] text-[13px]' } } },
    },
    tabs: {
      slots: {
        list: 'h-control gap-0.5 rounded-xl bg-sunken p-(--glot-control-inset) ring-1 ring-line ring-inset',
        indicator:
          'rounded-[9px] bg-panel shadow-lift ring-1 ring-line transition-[width,transform] duration-[180ms] ease-glot dark:bg-tile dark:ring-0',
        trigger:
          'h-control-inner px-[11px] text-[13px] font-medium text-ink-3 hover:text-ink data-[state=active]:text-ink',
      },
    },
    table: {
      slots: {
        thead: 'sticky top-0 z-[1] bg-panel',
        th: 'h-10 border-b border-line px-3 text-xs font-medium text-ink-3 first:pl-6',
        tr: 'transition-colors duration-[120ms] hover:bg-hover data-[selected=true]:bg-sel',
        td: 'border-b border-line px-3 py-3 text-sm text-ink first:pl-6',
        empty: 'py-14 text-center text-ink-3',
      },
    },
    modal: {
      variants: { overlay: { true: { overlay: 'bg-scrim backdrop-blur-[2px]' } } },
      slots: {
        overlay: 'bg-scrim backdrop-blur-[2px]',
        content: 'rounded-panel bg-panel shadow-dialog ring-1 ring-line',
        header: 'px-6 pt-[22px] pb-0 min-h-0 border-b-0',
        title: 'text-section text-ink',
        description: 'mt-1 text-[13px] text-ink-3',
        body: 'px-6 py-5',
        footer: 'gap-2 border-t border-line px-6 py-4',
      },
    },
    slideover: {
      variants: { overlay: { true: { overlay: 'bg-scrim backdrop-blur-[2px]' } } },
      slots: {
        overlay: 'bg-scrim backdrop-blur-[2px]',
        content: 'm-3 rounded-panel bg-panel shadow-dialog ring-1 ring-line sm:max-w-[560px]',
        header: 'min-h-0 border-b-0 px-6 pt-[22px]',
        title: 'text-section text-ink',
        body: 'px-6 py-5',
        footer: 'gap-2 border-t border-line px-6 py-4',
      },
    },
    popover: {
      slots: { content: 'rounded-card bg-panel shadow-pop ring-1 ring-line dark:bg-[#19191b]' },
    },
    dropdownMenu: {
      slots: {
        content:
          'min-w-[220px] rounded-card bg-panel p-1.5 shadow-pop ring-1 ring-line dark:bg-[#19191b]',
        item: 'h-8 gap-2.5 rounded-lg px-2.5 text-[13px] text-ink-2 data-highlighted:text-ink data-highlighted:before:bg-hover',
        itemLeadingIcon: 'size-[15px] text-ink-3',
        label: 'px-2.5 pt-2 pb-1.5 text-xs font-normal text-ink-3',
        separator: '-mx-1.5 my-1.5 bg-line',
      },
    },
    tooltip: {
      slots: { content: 'h-auto rounded-lg bg-ink px-[9px] py-1.5 text-xs text-panel ring-0' },
    },
    toast: {
      slots: {
        root: 'rounded-[14px] bg-panel p-3 pl-3.5 shadow-pop ring-1 ring-line',
        title: 'text-sm font-medium text-ink',
        description: 'text-[13px] text-ink-3',
      },
    },
    commandPalette: {
      slots: {
        input: '[&_input]:h-[58px] [&_input]:text-[17px]',
        label: 'px-2.5 pt-2.5 pb-1.5 text-xs font-medium text-ink-3',
        item: 'h-11 items-center gap-3 rounded-[11px] px-2.5 text-ink-2 data-highlighted:text-ink data-highlighted:before:bg-sel data-highlighted:before:ring-1 data-highlighted:before:ring-sel-ring data-highlighted:before:ring-inset',
        itemLeadingIcon: 'size-4 text-ink-3',
        footer: 'border-t border-line bg-panel-2',
      },
    },
    alert: {
      slots: {
        root: 'rounded-[14px] py-2.5 pr-3 pl-3.5 text-[13px]',
        title: 'font-semibold',
        icon: 'size-4',
      },
    },
    kbd: {
      base: 'h-[18px] min-w-[18px] rounded-[5px] bg-sunken px-[5px] font-mono text-[10.5px] font-medium text-ink-3 ring-1 ring-line ring-inset',
    },
    switch: {
      slots: {
        base: 'data-[state=checked]:bg-ink data-[state=unchecked]:bg-line-2',
        thumb: 'duration-[180ms] ease-quart',
      },
    },
    card: {
      slots: {
        root: 'rounded-panel bg-panel ring-1 ring-line divide-line',
        header: 'px-6 pt-5 pb-0 border-b-0',
        body: 'p-6 sm:p-6',
      },
    },
    navigationMenu: {
      slots: {
        link: 'h-[34px] gap-2.5 rounded-[10px] px-2.5 text-sm font-[450] text-ink-2 before:rounded-[10px] hover:text-ink hover:before:bg-hover-page data-active:font-medium data-active:text-ink data-active:before:bg-active-page',
        linkLeadingIcon: 'size-4 text-ink-3 group-data-active:text-ink',
        linkTrailingBadge: 'bg-transparent px-0 text-xs font-medium text-check tabular-nums ring-0',
      },
    },
    dashboardSidebar: {
      variants: { side: { left: { root: 'border-e-0' } } },
      slots: {
        root: 'border-e-0 bg-transparent',
        header: 'h-auto px-3 pt-3.5',
        body: 'gap-0.5 px-3',
        footer: 'flex-col items-stretch gap-0.5 px-3 pb-3',
      },
    },
    dashboardPanel: { slots: { root: 'bg-transparent', body: 'p-0 sm:p-0' } },
  },
})
