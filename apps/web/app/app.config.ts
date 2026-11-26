export default defineAppConfig({
  ui: {
    colors: { primary: 'blue', neutral: 'stone' },
    dashboardPanel: {
      slots: { root: 'md:my-3 md:mr-3 md:rounded-panel md:shadow-card bg-default' },
    },
    dashboardSidebar: { slots: { root: 'border-e-0 bg-transparent' } },
  },
})
