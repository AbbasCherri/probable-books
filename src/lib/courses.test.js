import { describe, it, expect } from 'vitest'
import { codeToSlug, matchCourse, matchCourses, normalizeCode } from '@/lib/courses'

const COURSES = [
  { code: 'BIOL 201', title: 'Cell Biology' },
  { code: 'CHEM 201', title: 'Organic Chemistry I' },
  { code: 'CHEM 202', title: 'Organic Chemistry II' },
  { code: 'CHEM 2011', title: 'Not a real code but tests prefix' },
  { code: 'CSC 201', title: 'Data Structures' },
  { code: 'MATH 201', title: 'Calculus III' },
  { code: 'PHYS 210', title: 'Electricity and Magnetism' },
  { code: 'EECE 230', title: 'Electric Circuits' },
]
const codes = (list) => list.map((c) => c.code)

describe('matchCourses', () => {
  it('returns nothing for an empty query', () => {
    expect(matchCourses(COURSES, '')).toEqual([])
    expect(matchCourses(COURSES, '   ')).toEqual([])
  })

  it('matches a spaced, hyphenated or compact code', () => {
    expect(codes(matchCourses(COURSES, 'CHEM 201'))[0]).toBe('CHEM 201')
    expect(codes(matchCourses(COURSES, 'chem-201'))[0]).toBe('CHEM 201')
    expect(codes(matchCourses(COURSES, 'chem201'))[0]).toBe('CHEM 201')
  })

  it('ranks exact code, then code prefix, then code substring, then title', () => {
    expect(codes(matchCourses(COURSES, 'chem201'))).toEqual(['CHEM 201', 'CHEM 2011'])
    // "201" is a substring of several codes; none is an exact or prefix match.
    expect(codes(matchCourses(COURSES, '201'))).toEqual([
      'BIOL 201',
      'CHEM 201',
      'CHEM 2011',
      'CSC 201',
      'MATH 201',
    ])
    // "ch" prefixes CHEM codes and is a substring of a title ("Organic CHemistry" too).
    const ch = codes(matchCourses(COURSES, 'ch'))
    expect(ch.slice(0, 3)).toEqual(['CHEM 201', 'CHEM 2011', 'CHEM 202'])
  })

  it('matches a title substring, case-insensitively', () => {
    expect(codes(matchCourses(COURSES, 'electric'))).toEqual(['EECE 230', 'PHYS 210'])
    expect(codes(matchCourses(COURSES, 'ORGANIC'))).toEqual(['CHEM 201', 'CHEM 202'])
  })

  it('puts code matches above title matches', () => {
    const list = codes(matchCourses(COURSES, 'c'))
    expect(list.indexOf('CSC 201')).toBeLessThan(list.indexOf('PHYS 210'))
  })

  it('excludes given codes and honours the limit', () => {
    expect(codes(matchCourses(COURSES, 'chem', { exclude: ['CHEM 201'] }))).not.toContain(
      'CHEM 201',
    )
    expect(matchCourses(COURSES, '201', { limit: 2 })).toHaveLength(2)
  })

  it('returns the course objects themselves', () => {
    expect(matchCourses(COURSES, 'csc')[0]).toBe(COURSES[4])
  })
})

describe('matchCourse', () => {
  it('gives the matched field and range in the display string', () => {
    expect(matchCourse(COURSES[1], 'chem201')).toMatchObject({
      rank: 0,
      field: 'code',
      index: 0,
      length: 8,
    })
    expect(matchCourse(COURSES[1], 'em2')).toMatchObject({
      field: 'code',
      index: 2,
      length: 4,
    })
    expect(matchCourse(COURSES[1], 'organic')).toMatchObject({
      rank: 3,
      field: 'title',
      index: 0,
      length: 7,
    })
    expect(matchCourse(COURSES[1], 'zzz')).toBeNull()
  })
})

describe('existing helpers', () => {
  it('still normalise and slug codes', () => {
    expect(normalizeCode('chem-201')).toBe('CHEM 201')
    expect(codeToSlug('CHEM 201')).toBe('CHEM-201')
  })
})
