// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { clearDraft, readDraft, writeDraft } from './draft'

beforeEach(() => localStorage.clear())

describe('sell-form draft', () => {
  it('belongs to the user who wrote it', () => {
    expect(writeDraft({ title: 'Clark book', photos: [] }, 'usr_a')).toBe(true)
    expect(readDraft('usr_a')).toMatchObject({ title: 'Clark book' })
    expect(readDraft('usr_b')).toBeNull()
  })

  it('keeps photos out of the stored draft', () => {
    writeDraft({ title: 't', photos: [{ url: 'blob:x' }] }, 'usr_a')
    expect(readDraft('usr_a')).not.toHaveProperty('photos')
  })

  it('does nothing without a signed-in user', () => {
    expect(writeDraft({ title: 't' }, undefined)).toBe(false)
    expect(readDraft(undefined)).toBeNull()
    expect(localStorage.length).toBe(0)
  })

  it('clears only that user’s draft', () => {
    writeDraft({ title: 'a' }, 'usr_a')
    writeDraft({ title: 'b' }, 'usr_b')
    clearDraft('usr_a')
    expect(readDraft('usr_a')).toBeNull()
    expect(readDraft('usr_b')).toMatchObject({ title: 'b' })
  })

  it('drops the old shared draft nobody can claim', () => {
    localStorage.setItem('pb.sellDraft', JSON.stringify({ title: 'old' }))
    expect(readDraft('usr_a')).toBeNull()
    expect(localStorage.getItem('pb.sellDraft')).toBeNull()
  })
})
