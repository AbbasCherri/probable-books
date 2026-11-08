import { useId, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router'
import { Menu, X } from 'lucide-react'
import { Highlight } from '@/components/annotate/Highlight'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/cn'

function navItems(user) {
  return [
    { to: '/browse', label: 'Browse' },
    { to: '/sell', label: 'Sell' },
    ...(user ? [{ to: '/dashboard', label: 'Ledger' }] : []),
  ]
}

function NavItem({ to, label, onNavigate, className }) {
  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={cn('flex min-h-11 items-center text-ink-900 no-underline', className)}
    >
      {({ isActive }) =>
        isActive ? (
          <Highlight color="blue">{label}</Highlight>
        ) : (
          <span className="hover:underline">{label}</span>
        )
      }
    </NavLink>
  )
}

/**
 * Global navigation (section 4). From md the links sit inline; below md they live in a
 * menu panel under the header. The active page is marked with a blue highlighter.
 */
export function SiteHeader() {
  const { user, ready, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const items = navItems(user)
  const close = () => setOpen(false)

  async function signOut() {
    close()
    await logout()
    navigate('/')
  }

  return (
    <header
      className="border-b-3 border-double border-ink-900 bg-paper-100"
      onKeyDown={(e) => e.key === 'Escape' && close()}
    >
      <div className="mx-auto flex min-h-14 max-w-page items-center gap-8 pr-1 pl-4 sm:px-8 md:min-h-16">
        <Link
          to="/"
          onClick={close}
          className="font-serif text-lg font-semibold text-ink-900 no-underline md:text-xl"
        >
          Probable Books
        </Link>

        <nav aria-label="Main" className="hidden flex-1 md:block">
          <ul className="flex gap-6">
            {items.map((item) => (
              <li key={item.to}>
                <NavItem {...item} className="font-medium" />
              </li>
            ))}
          </ul>
        </nav>

        <div className={cn('hidden items-center gap-3 md:flex', !ready && 'invisible')}>
          {user ? (
            <>
              <span className="text-sm text-ink-500">{user.name}</span>
              <Button variant="ghost" size="sm" onClick={signOut}>
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="flex min-h-11 items-center px-2 font-medium text-ink-900 no-underline hover:underline"
              >
                Sign in
              </Link>
              <Button as={Link} to="/register" variant="outline" size="sm">
                Get a card
              </Button>
            </>
          )}
        </div>

        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((o) => !o)}
          className="ml-auto grid size-12 place-items-center rounded-paper text-ink-900 hover:bg-paper-200 md:hidden"
        >
          {open ? (
            <X size={22} strokeWidth={1.5} aria-hidden="true" />
          ) : (
            <Menu size={22} strokeWidth={1.5} aria-hidden="true" />
          )}
          <span className="sr-only">{open ? 'Close menu' : 'Menu'}</span>
        </button>
      </div>

      {open && (
        <div id={panelId} className="border-t border-paper-300 px-4 pt-2 pb-5 md:hidden">
          <nav aria-label="Main">
            <ul className="flex flex-col">
              {items.map((item) => (
                <li key={item.to}>
                  <NavItem {...item} onNavigate={close} className="text-lg" />
                </li>
              ))}
            </ul>
          </nav>
          <div className="mt-3 flex flex-col gap-3 border-t border-paper-300 pt-4">
            {user ? (
              <>
                <p className="text-sm text-ink-500">Signed in as {user.name}</p>
                <Button variant="outline" size="lg" onClick={signOut}>
                  Sign out
                </Button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={close}
                  className="flex min-h-11 items-center text-lg text-ink-900 no-underline"
                >
                  Sign in
                </Link>
                <Button
                  as={Link}
                  to="/register"
                  onClick={close}
                  variant="outline"
                  size="lg"
                >
                  Get a card
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
