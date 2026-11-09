import { useEffect, useId, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router'
import { Menu, Search, X } from 'lucide-react'
import { CourseLookup } from '@/components/layout/CourseLookup'
import { ReadingLight } from '@/components/layout/ReadingLight'
import { Highlight } from '@/components/annotate/Highlight'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/context/AuthContext'
import { useCourses } from '@/context/CoursesContext'
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
      className={cn(
        'flex min-h-11 min-w-11 items-center text-ink-900 no-underline',
        className,
      )}
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
 * menu panel under the header, with the Reading light setting (section 10). The active page is
 * marked with a blue highlighter. Every link and button is at least 44x44px. The menu and the
 * lookup panel close on any navigation; Esc closes them and puts focus back on their button.
 */
export function SiteHeader() {
  const { user, ready, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  // Like the lookup panel, the menu belongs to the page it was opened on.
  const [menuAt, setMenuAt] = useState(null)
  const open = menuAt === pathname
  // The lookup panel is tied to the page it was opened on, so it closes on any navigation.
  const [searchAt, setSearchAt] = useState(null)
  const searchOpen = searchAt === pathname
  const { courses } = useCourses(searchOpen)
  const panelId = useId()
  const searchId = useId()
  const searchButton = useRef(null)
  const searchPanel = useRef(null)
  const menuButton = useRef(null)
  const items = navItems(user)
  const close = () => {
    setMenuAt(null)
    setSearchAt(null)
  }

  function toggleSearch() {
    setMenuAt(null)
    setSearchAt(searchOpen ? null : pathname)
  }

  useEffect(() => {
    if (!searchOpen) return
    function onPointerDown(e) {
      if (
        !searchPanel.current?.contains(e.target) &&
        !searchButton.current?.contains(e.target)
      ) {
        setSearchAt(null)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [searchOpen])

  async function signOut() {
    close()
    await logout()
    navigate('/')
  }

  return (
    <header
      className="relative border-b-3 border-double border-ink-900 bg-paper-100"
      onKeyDown={(e) => {
        if (e.key !== 'Escape') return
        if (searchOpen) searchButton.current?.focus()
        else if (open) menuButton.current?.focus()
        close()
      }}
    >
      <div className="mx-auto flex min-h-14 max-w-page items-center gap-8 pr-1 pl-4 sm:px-8 md:min-h-16">
        <Link
          to="/"
          onClick={close}
          className="inline-flex min-h-11 min-w-11 items-center font-serif text-lead font-semibold text-ink-900 no-underline md:text-h3"
        >
          Probable Books
        </Link>

        <nav aria-label="Main" className="hidden flex-1 md:block">
          <ul className="flex gap-6">
            {items.map((item) => (
              <li key={item.to}>
                <NavItem {...item} />
              </li>
            ))}
          </ul>
        </nav>

        <div className={cn('hidden items-center gap-3 md:flex', !ready && 'invisible')}>
          {user ? (
            <>
              <span className="text-small text-ink-500">{user.name}</span>
              <Button variant="ghost" size="sm" onClick={signOut}>
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="flex min-h-11 items-center px-2 text-ink-900 no-underline hover:underline"
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
          ref={searchButton}
          type="button"
          aria-expanded={searchOpen}
          aria-controls={searchId}
          onClick={toggleSearch}
          className="ml-auto grid size-12 place-items-center rounded-paper text-ink-900 hover:bg-paper-200 md:ml-0"
        >
          <Search strokeWidth={1.5} aria-hidden="true" className="size-5.5" />
          <span className="sr-only">Search courses</span>
        </button>

        <button
          ref={menuButton}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => {
            setSearchAt(null)
            setMenuAt(open ? null : pathname)
          }}
          className="-ml-6 grid size-12 place-items-center rounded-paper text-ink-900 hover:bg-paper-200 md:hidden"
        >
          {open ? (
            <X strokeWidth={1.5} aria-hidden="true" className="size-5.5" />
          ) : (
            <Menu strokeWidth={1.5} aria-hidden="true" className="size-5.5" />
          )}
          <span className="sr-only">{open ? 'Close menu' : 'Menu'}</span>
        </button>
      </div>

      {searchOpen && (
        <div
          id={searchId}
          ref={searchPanel}
          className="border-t border-paper-300 bg-paper-50 px-4 py-4 sm:px-8 lg:absolute lg:top-full lg:right-8 lg:z-header lg:w-96 lg:rounded-dialog lg:border lg:border-paper-400 lg:shadow-stack"
        >
          <CourseLookup
            courses={courses}
            autoFocus
            onNavigate={() => setSearchAt(null)}
          />
        </div>
      )}

      {open && (
        <div id={panelId} className="border-t border-paper-300 px-4 pt-2 pb-5 md:hidden">
          <nav aria-label="Main">
            <ul className="flex flex-col">
              {items.map((item) => (
                <li key={item.to}>
                  <NavItem {...item} onNavigate={close} className="text-lead" />
                </li>
              ))}
            </ul>
          </nav>
          <div className="mt-3 flex flex-col gap-3 border-t border-paper-300 pt-4">
            {user ? (
              <>
                <p className="text-small text-ink-500">Signed in as {user.name}</p>
                <Button variant="outline" size="lg" onClick={signOut}>
                  Sign out
                </Button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={close}
                  className="flex min-h-11 items-center text-lead text-ink-900 no-underline"
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
          <ReadingLight className="mt-4 border-t border-paper-300 pt-4" />
        </div>
      )}
    </header>
  )
}
