import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ImageGallery } from './ImageGallery'

const photo = (n, of) => ({ url: `/p${n}.svg`, alt: `Book, photo ${n} of ${of}` })
const listingWith = (count) => ({
  title: 'Organic Chemistry study guide',
  category: 'textbook',
  photos: Array.from({ length: count }, (_, i) => photo(i + 1, count)),
})

const mainPhoto = () => within(screen.getByTestId('gallery')).getAllByRole('img')[0]
// jsdom has no layout, so both the phone dots and the thumbnails are in the tree.
const thumbs = () =>
  within(screen.getByTestId('gallery-thumbs')).getAllByRole('button', {
    name: /^Show photo/,
  })

describe('ImageGallery', () => {
  it('moves with the arrow keys, Home and End, and follows focus', async () => {
    const user = userEvent.setup()
    render(<ImageGallery listing={listingWith(3)} />)
    expect(mainPhoto()).toHaveAttribute('alt', 'Book, photo 1 of 3')
    expect(thumbs()[0]).toHaveAttribute('aria-current', 'true')

    thumbs()[0].focus()
    await user.keyboard('{ArrowRight}')
    expect(mainPhoto()).toHaveAttribute('alt', 'Book, photo 2 of 3')
    expect(thumbs()[1]).toHaveAttribute('aria-current', 'true')
    expect(thumbs()[1]).toHaveFocus()

    await user.keyboard('{ArrowRight}{ArrowRight}')
    expect(mainPhoto()).toHaveAttribute('alt', 'Book, photo 1 of 3')
    await user.keyboard('{ArrowLeft}')
    expect(mainPhoto()).toHaveAttribute('alt', 'Book, photo 3 of 3')
    await user.keyboard('{Home}')
    expect(mainPhoto()).toHaveAttribute('alt', 'Book, photo 1 of 3')
    await user.keyboard('{End}')
    expect(mainPhoto()).toHaveAttribute('alt', 'Book, photo 3 of 3')
    expect(screen.getByText('Photo 3 of 3: Book, photo 3 of 3')).toBeInTheDocument()
  })

  it('only the current thumbnail is in the tab order', () => {
    render(<ImageGallery listing={listingWith(3)} />)
    expect(thumbs().map((b) => b.tabIndex)).toEqual([0, -1, -1])
  })

  it('jumps to a photo from its button and from Next', async () => {
    const user = userEvent.setup()
    render(<ImageGallery listing={listingWith(3)} />)
    await user.click(thumbs()[2])
    expect(mainPhoto()).toHaveAttribute('alt', 'Book, photo 3 of 3')
    await user.click(screen.getByRole('button', { name: 'Next photo' }))
    expect(mainPhoto()).toHaveAttribute('alt', 'Book, photo 1 of 3')
  })

  it('swipes', () => {
    render(<ImageGallery listing={listingWith(3)} />)
    const stage = screen.getByTestId('gallery-stage')
    fireEvent.touchStart(stage, { touches: [{ clientX: 200, clientY: 10 }] })
    fireEvent.touchEnd(stage, { changedTouches: [{ clientX: 100, clientY: 12 }] })
    expect(mainPhoto()).toHaveAttribute('alt', 'Book, photo 2 of 3')
    fireEvent.touchStart(stage, { touches: [{ clientX: 100, clientY: 10 }] })
    fireEvent.touchEnd(stage, { changedTouches: [{ clientX: 220, clientY: 10 }] })
    expect(mainPhoto()).toHaveAttribute('alt', 'Book, photo 1 of 3')
    // A mostly vertical drag is a scroll, not a swipe.
    fireEvent.touchStart(stage, { touches: [{ clientX: 200, clientY: 10 }] })
    fireEvent.touchEnd(stage, { changedTouches: [{ clientX: 140, clientY: 200 }] })
    expect(mainPhoto()).toHaveAttribute('alt', 'Book, photo 1 of 3')
  })

  it('one photo: no controls', () => {
    render(<ImageGallery listing={listingWith(1)} />)
    expect(screen.queryAllByRole('button')).toHaveLength(0)
    expect(mainPhoto()).toHaveAttribute('alt', 'Book, photo 1 of 1')
  })

  it('no photos: the ruled index card, no controls', () => {
    render(<ImageGallery listing={listingWith(0)} />)
    expect(screen.queryAllByRole('button')).toHaveLength(0)
    expect(screen.getByText('Organic Chemistry study guide')).toBeInTheDocument()
  })

  it('fills in alt text the seller left out', () => {
    const listing = { ...listingWith(2), title: 'Kit' }
    listing.photos[1].alt = ''
    render(<ImageGallery listing={listing} />)
    fireEvent.click(thumbs()[1])
    expect(mainPhoto()).toHaveAttribute('alt', 'Kit, photo 2 of 2')
  })
})
