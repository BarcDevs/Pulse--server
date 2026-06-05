// @ts-nocheck
import { loginSchema } from '../../schemas/auth/loginSchema'
import { signupSchema } from '../../schemas/auth/signupSchema'
import { newPostSchema } from '../../schemas/forum/newPostSchema'
import { newReplySchema } from '../../schemas/forum/newReplySchema'
import { updateProfileSchema } from '../../schemas/profile/updateProfileSchema'

const SQL_INJECTIONS = [
    "' OR '1'='1",
    '"; DROP TABLE users; --',
    "1; SELECT * FROM users WHERE '1'='1",
    "' UNION SELECT null, null, null --",
    "admin'--"
]

const XSS_PAYLOADS = [
    '<script>alert(1)</script>',
    '<img src=x onerror=alert(1)>',
    'javascript:alert(1)',
    '<svg onload=alert(1)>',
    '"><script>alert(document.cookie)</script>'
]

const LONG_STRING_10K = 'a'.repeat(10000)
const LONG_STRING_500 = 'a'.repeat(501)

describe('Schema Adversarial Inputs', () => {
    // ==================== Auth Schemas ====================
    describe('signupSchema', () => {
        it.each(SQL_INJECTIONS)(
            'rejects SQL injection in email: %s',
            (payload) => {
                const result = signupSchema.safeParse({
                    firstName: 'Test',
                    lastName: 'User',
                    email: payload,
                    password: 'Password123!'
                })
                expect(result.success).toBe(false)
            }
        )

        it.each(XSS_PAYLOADS)(
            'rejects XSS payload in firstName: %s',
            (payload) => {
                const result = signupSchema.safeParse({
                    firstName: payload,
                    lastName: 'User',
                    email: 'test@test.com',
                    password: 'Password123!'
                })
                expect(result.success).toBe(false)
            }
        )

        it('rejects username with SQL injection characters', () => {
            const result = signupSchema.safeParse({
                firstName: 'Test',
                lastName: 'User',
                username: "admin'--",
                email: 'test@test.com',
                password: 'Password123!'
            })
            expect(result.success).toBe(false)
        })

        it('rejects malformed email (no @ symbol)', () => {
            const result = signupSchema.safeParse({
                firstName: 'Test',
                lastName: 'User',
                email: LONG_STRING_10K,
                password: 'Password123!'
            })
            expect(result.success).toBe(false)
        })
    })

    describe('loginSchema', () => {
        it.each(SQL_INJECTIONS)(
            'rejects SQL injection in email: %s',
            (payload) => {
                const result = loginSchema.safeParse({
                    email: payload,
                    password: 'Password123!'
                })
                expect(result.success).toBe(false)
            }
        )
    })

    // ==================== Forum Schemas ====================
    describe('newPostSchema', () => {
        it.each(XSS_PAYLOADS)(
            'accepts XSS payload in body (text field, sanitized at output): %s',
            (payload) => {
                const result = newPostSchema.safeParse({
                    title: 'Test Post',
                    body: payload,
                    category: 'general',
                    tags: []
                })
                expect(result.success).toBe(true)
            }
        )

        it('accepts 10K character body (no max on text fields)', () => {
            const result = newPostSchema.safeParse({
                title: 'Test',
                body: LONG_STRING_10K,
                category: 'general',
                tags: []
            })
            expect(result.success).toBe(true)
        })

        it('accepts unicode and emoji in title', () => {
            const result = newPostSchema.safeParse({
                title: 'שלום 😊 مرحبا',
                body: 'content',
                category: 'general',
                tags: []
            })
            expect(result.success).toBe(true)
        })
    })

    describe('newReplySchema', () => {
        it('accepts unicode in reply body', () => {
            const result = newReplySchema.safeParse({
                body: '日本語テスト 🎉'
            })
            expect(result.success).toBe(true)
        })

        it('rejects empty body', () => {
            const result = newReplySchema.safeParse({ body: '' })
            expect(result.success).toBe(false)
        })
    })

    // ==================== Profile Schema ====================
    describe('updateProfileSchema', () => {
        it('rejects bio exceeding 500 characters', () => {
            const result = updateProfileSchema.safeParse({
                bio: LONG_STRING_500
            })
            expect(result.success).toBe(false)
            expect(result.error?.issues[0].path).toContain('bio')
        })

        it('accepts unicode in bio', () => {
            const result = updateProfileSchema.safeParse({
                bio: 'שלום 😊 مرحبا こんにちは'
            })
            expect(result.success).toBe(true)
        })

        it.each(XSS_PAYLOADS)(
            'accepts XSS payload in bio (text field, sanitized at output): %s',
            (payload) => {
                const trimmedPayload = payload.length <= 500
                    ? payload
                    : payload.slice(0, 500)
                const result = updateProfileSchema.safeParse({
                    bio: trimmedPayload
                })
                expect(result.success).toBe(true)
            }
        )

        it('rejects location exceeding 100 characters', () => {
            const result = updateProfileSchema.safeParse({
                location: 'a'.repeat(101)
            })
            expect(result.success).toBe(false)
            expect(result.error?.issues[0].path).toContain('location')
        })

        it('rejects plain string in image field (not a URL)', () => {
            const result = updateProfileSchema.safeParse({
                image: 'not-a-url-at-all'
            })
            expect(result.success).toBe(false)
        })

        it('rejects XSS in image field (not a valid URL)', () => {
            const result = updateProfileSchema.safeParse({
                image: '<script>alert(1)</script>'
            })
            expect(result.success).toBe(false)
        })

        it('accepts valid HTTPS image URL', () => {
            const result = updateProfileSchema.safeParse({
                image: 'https://example.com/avatar.jpg'
            })
            expect(result.success).toBe(true)
        })

        it('rejects invalid timezone format', () => {
            const result = updateProfileSchema.safeParse({
                timezone: "<script>alert('tz')</script>"
            })
            expect(result.success).toBe(false)
        })
    })
})
