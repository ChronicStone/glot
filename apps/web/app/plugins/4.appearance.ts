export default defineNuxtPlugin(() => {
  const { appearance, choose } = useAppearance()

  choose(appearance.value)
})
