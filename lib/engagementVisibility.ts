export function shouldHideEngagementUi(pathname: string | null): boolean {
  if (!pathname) return false

  return (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/account') ||
    pathname.startsWith('/vendors/dashboard') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/forgot-password')
  )
}
