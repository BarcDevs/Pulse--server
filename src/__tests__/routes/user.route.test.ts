// @ts-nocheck
import supertest from 'supertest'

import App from '../../app'
import { hashPassword } from '../../lib/authCrypto'
import { prismaMock } from '../setup/jestSetup'
import {
    createAuthenticatedRequest,
    createMockUser,
    withCsrfAuth
} from '../setup/testSetup'

describe('User Routes', () => {
    // ==================== PATCH /api/v1/users/me ====================
    describe('PATCH /api/v1/users/me', () => {
        const updateUserEndpoint = '/api/v1/users/me'

        it('should update user firstName', async () => {
            const mockUser = createMockUser()
            const {
                token,
                csrfSecret,
                csrfToken
            } = createAuthenticatedRequest(mockUser)

            prismaMock.user.findUnique
                .mockResolvedValue(mockUser)
            prismaMock.user.update
                .mockResolvedValue({
                    ...mockUser,
                    firstName: 'John'
                })

            const response = await withCsrfAuth(
                supertest(App).patch(updateUserEndpoint),
                token,
                csrfSecret,
                csrfToken
            ).send({ firstName: 'John' })

            expect(response.status).toBe(200)
            expect(response.body.message).toBe(
                'User updated successfully'
            )
            expect(response.body.data.user.firstName)
                .toBe('John')
        })

        it('should update user lastName', async () => {
            const mockUser = createMockUser()
            const {
                token,
                csrfSecret,
                csrfToken
            } = createAuthenticatedRequest(mockUser)

            prismaMock.user.findUnique
                .mockResolvedValue(mockUser)
            prismaMock.user.update
                .mockResolvedValue({
                    ...mockUser,
                    lastName: 'Doe'
                })

            const response = await withCsrfAuth(
                supertest(App).patch(updateUserEndpoint),
                token,
                csrfSecret,
                csrfToken
            ).send({ lastName: 'Doe' })

            expect(response.status).toBe(200)
            expect(response.body.data.user.lastName)
                .toBe('Doe')
        })

        it('should update user username', async () => {
            const mockUser = createMockUser()
            const {
                token,
                csrfSecret,
                csrfToken
            } = createAuthenticatedRequest(mockUser)

            prismaMock.user.findUnique
                .mockResolvedValueOnce(mockUser)
                .mockResolvedValueOnce(null)
            prismaMock.user.update
                .mockResolvedValue({
                    ...mockUser,
                    username: 'newusername'
                })

            const response = await withCsrfAuth(
                supertest(App).patch(updateUserEndpoint),
                token,
                csrfSecret,
                csrfToken
            ).send({ username: 'newusername' })

            expect(response.status).toBe(200)
            expect(response.body.data.user.username)
                .toBe('newusername')
        })

        it('should update user email', async () => {
            const mockUser = createMockUser()
            const {
                token,
                csrfSecret,
                csrfToken
            } = createAuthenticatedRequest(mockUser)

            prismaMock.user.findUnique
                .mockResolvedValueOnce(mockUser)
                .mockResolvedValueOnce(null)
            prismaMock.user.update
                .mockResolvedValue({
                    ...mockUser,
                    email: 'newemail@test.com'
                })

            const response = await withCsrfAuth(
                supertest(App).patch(updateUserEndpoint),
                token,
                csrfSecret,
                csrfToken
            ).send({ email: 'newemail@test.com' })

            expect(response.status).toBe(200)
            expect(response.body.data.user.email)
                .toBe('newemail@test.com')
        })

        it('should update multiple fields at once',
            async () => {
                const mockUser = createMockUser()
                const {
                    token,
                    csrfSecret,
                    csrfToken
                } = createAuthenticatedRequest(mockUser)

                prismaMock.user.findUnique
                    .mockResolvedValueOnce(mockUser)
                    .mockResolvedValueOnce(null)
                    .mockResolvedValueOnce(null)
                prismaMock.user.update
                    .mockResolvedValue({
                        ...mockUser,
                        firstName: 'John',
                        lastName: 'Doe',
                        username: 'johndoe'
                    })

                const response = await withCsrfAuth(
                    supertest(App).patch(updateUserEndpoint),
                    token,
                    csrfSecret,
                    csrfToken
                ).send({
                    firstName: 'John',
                    lastName: 'Doe',
                    username: 'johndoe'
                })

                expect(response.status).toBe(200)
                expect(response.body.data.user.firstName)
                    .toBe('John')
                expect(response.body.data.user.lastName)
                    .toBe('Doe')
                expect(response.body.data.user.username)
                    .toBe('johndoe')
            }
        )

        it('should reject duplicate email', async () => {
            const mockUser = createMockUser()
            const otherUser = createMockUser({
                email: 'taken@test.com'
            })
            const {
                token,
                csrfSecret,
                csrfToken
            } = createAuthenticatedRequest(mockUser)

            prismaMock.user.findUnique
                .mockResolvedValueOnce(mockUser)
                .mockResolvedValueOnce(otherUser)

            const response = await withCsrfAuth(
                supertest(App).patch(updateUserEndpoint),
                token,
                csrfSecret,
                csrfToken
            ).send({ email: 'taken@test.com' })

            expect(response.status).toBe(409)
            expect(response.body.error[0].error).toContain(
                'Email already in use'
            )
        })

        it('should reject duplicate username', async () => {
            const mockUser = createMockUser()
            const otherUser = createMockUser({
                username: 'takenname'
            })
            const {
                token,
                csrfSecret,
                csrfToken
            } = createAuthenticatedRequest(mockUser)

            prismaMock.user.findUnique
                .mockResolvedValueOnce(mockUser)
                .mockResolvedValueOnce(otherUser)

            const response = await withCsrfAuth(
                supertest(App).patch(updateUserEndpoint),
                token,
                csrfSecret,
                csrfToken
            ).send({ username: 'takenname' })

            expect(response.status).toBe(409)
            expect(response.body.error[0].error).toContain(
                'Username already taken'
            )
        })

        it('should return 400 for invalid username length',
            async () => {
                const mockUser = createMockUser()
                const {
                    token,
                    csrfSecret,
                    csrfToken
                } = createAuthenticatedRequest(mockUser)

                const response = await withCsrfAuth(
                    supertest(App).patch(updateUserEndpoint),
                    token,
                    csrfSecret,
                    csrfToken
                ).send({ username: 'ab' })

                expect(response.status).toBe(400)
                expect(response.body.error[0].statusType)
                    .toBe('Validation Error')
                expect(response.body.error[0].property)
                    .toBe('username')
            }
        )

        it('should return 400 for invalid email format',
            async () => {
                const mockUser = createMockUser()
                const {
                    token,
                    csrfSecret,
                    csrfToken
                } = createAuthenticatedRequest(mockUser)

                const response = await withCsrfAuth(
                    supertest(App).patch(updateUserEndpoint),
                    token,
                    csrfSecret,
                    csrfToken
                ).send({ email: 'invalid-email' })

                expect(response.status).toBe(400)
                expect(response.body.error[0].statusType)
                    .toBe('Validation Error')
                expect(response.body.error[0].property)
                    .toBe('email')
            }
        )

        it('should return 401 for unauthenticated request',
            async () => {
                const response = await supertest(App)
                    .patch(updateUserEndpoint)
                    .send({ firstName: 'John' })

                expect(response.status).toBe(401)
            }
        )
    })

    // ==================== PATCH /api/v1/users/password ====================
    describe('PATCH /api/v1/users/password', () => {
        const updatePasswordEndpoint = '/api/v1/users/password'

        it('should update password with valid input',
            async () => {
                const mockUser = createMockUser({
                    password: hashPassword('OldPassword123!')
                })
                const {
                    token,
                    csrfSecret,
                    csrfToken
                } = createAuthenticatedRequest(mockUser)

                prismaMock.user.findUnique
                    .mockResolvedValue(mockUser)
                prismaMock.user.update
                    .mockResolvedValue({
                        ...mockUser,
                        passwordUpdatedAt: new Date()
                    })

                const response = await withCsrfAuth(
                    supertest(App).patch(updatePasswordEndpoint),
                    token,
                    csrfSecret,
                    csrfToken
                ).send({
                    currentPassword: 'OldPassword123!',
                    newPassword: 'NewPassword456!'
                })

                expect(response.status).toBe(200)
                expect(response.body.message).toBe(
                    'Password updated successfully'
                )
                expect(response.body.data.user).toBeDefined()
            }
        )

        it('should reject invalid current password',
            async () => {
                const mockUser = createMockUser({
                    password: hashPassword('OldPassword123!')
                })
                const {
                    token,
                    csrfSecret,
                    csrfToken
                } = createAuthenticatedRequest(mockUser)

                prismaMock.user.findUnique
                    .mockResolvedValue(mockUser)

                const response = await withCsrfAuth(
                    supertest(App).patch(updatePasswordEndpoint),
                    token,
                    csrfSecret,
                    csrfToken
                ).send({
                    currentPassword: 'WrongPassword123!',
                    newPassword: 'NewPassword456!'
                })

                expect(response.status).toBe(401)
                expect(response.body.error[0].error).toContain(
                    'Invalid current password'
                )
            }
        )

        it('should reject weak new password', async () => {
            const mockUser = createMockUser({
                password: hashPassword('OldPassword123!')
            })
            const {
                token,
                csrfSecret,
                csrfToken
            } = createAuthenticatedRequest(mockUser)

            const response = await withCsrfAuth(
                supertest(App).patch(updatePasswordEndpoint),
                token,
                csrfSecret,
                csrfToken
            ).send({
                currentPassword: 'OldPassword123!',
                newPassword: 'weak'
            })

            expect(response.status).toBe(400)
            expect(response.body.error[0].statusType)
                .toBe('Validation Error')
            expect(response.body.error[0].property)
                .toBe('newPassword')
        })

        it('should reject password without letters',
            async () => {
                const mockUser = createMockUser({
                    password: hashPassword('OldPassword123!')
                })
                const {
                    token,
                    csrfSecret,
                    csrfToken
                } = createAuthenticatedRequest(mockUser)

                const response = await withCsrfAuth(
                    supertest(App).patch(updatePasswordEndpoint),
                    token,
                    csrfSecret,
                    csrfToken
                ).send({
                    currentPassword: 'OldPassword123!',
                    newPassword: '12345678'
                })

                expect(response.status).toBe(400)
                expect(response.body.error[0].statusType)
                    .toBe('Validation Error')
            }
        )

        it('should reject password without numbers',
            async () => {
                const mockUser = createMockUser({
                    password: hashPassword('OldPassword123!')
                })
                const {
                    token,
                    csrfSecret,
                    csrfToken
                } = createAuthenticatedRequest(mockUser)

                const response = await withCsrfAuth(
                    supertest(App).patch(updatePasswordEndpoint),
                    token,
                    csrfSecret,
                    csrfToken
                ).send({
                    currentPassword: 'OldPassword123!',
                    newPassword: 'OnlyLetters'
                })

                expect(response.status).toBe(400)
                expect(response.body.error[0].statusType)
                    .toBe('Validation Error')
            }
        )

        it('should return 400 for missing currentPassword',
            async () => {
                const mockUser = createMockUser()
                const {
                    token,
                    csrfSecret,
                    csrfToken
                } = createAuthenticatedRequest(mockUser)

                const response = await withCsrfAuth(
                    supertest(App).patch(updatePasswordEndpoint),
                    token,
                    csrfSecret,
                    csrfToken
                ).send({
                    newPassword: 'NewPassword456!'
                })

                expect(response.status).toBe(400)
                expect(response.body.error[0].statusType)
                    .toBe('Validation Error')
                expect(response.body.error[0].property)
                    .toBe('currentPassword')
            }
        )

        it('should return 400 for missing newPassword',
            async () => {
                const mockUser = createMockUser()
                const {
                    token,
                    csrfSecret,
                    csrfToken
                } = createAuthenticatedRequest(mockUser)

                const response = await withCsrfAuth(
                    supertest(App).patch(updatePasswordEndpoint),
                    token,
                    csrfSecret,
                    csrfToken
                ).send({
                    currentPassword: 'OldPassword123!'
                })

                expect(response.status).toBe(400)
                expect(response.body.error[0].statusType)
                    .toBe('Validation Error')
                expect(response.body.error[0].property)
                    .toBe('newPassword')
            }
        )

        it('should return 401 for unauthenticated request',
            async () => {
                const response = await supertest(App)
                    .patch(updatePasswordEndpoint)
                    .send({
                        currentPassword: 'OldPassword123!',
                        newPassword: 'NewPassword456!'
                    })

                expect(response.status).toBe(401)
            }
        )
    })

    // ==================== DELETE /api/v1/users/me ====================
    describe('DELETE /api/v1/users/me', () => {
        const deleteUserEndpoint = '/api/v1/users/me'

        it('should deactivate user account', async () => {
            const mockUser = createMockUser()
            const {
                token,
                csrfSecret,
                csrfToken
            } = createAuthenticatedRequest(mockUser)

            prismaMock.user.findUnique
                .mockResolvedValue(mockUser)
            prismaMock.user.update
                .mockResolvedValue({
                    ...mockUser,
                    active: false
                })

            const response = await withCsrfAuth(
                supertest(App).delete(deleteUserEndpoint),
                token,
                csrfSecret,
                csrfToken
            )

            expect(response.status).toBe(204)
            expect(prismaMock.user.findUnique)
                .toHaveBeenCalledWith({
                    where: { id: mockUser.id },
                    include: {
                        profile: {
                            select: {
                                id: true,
                                image: true,
                                timezone: true,
                                theme: true,
                                language: true,
                                lastCheckInAt: true
                            }
                        }
                    }
                })
            expect(prismaMock.user.update)
                .toHaveBeenCalledWith({
                    where: { id: mockUser.id },
                    data: { active: false }
                })

            const cookies = response.headers['set-cookie'] as string[]
            expect(cookies).toBeDefined()
            expect(cookies.some(c => c.startsWith('accessToken=;'))).toBe(true)
            expect(cookies.some(c => c.startsWith('_csrf=;'))).toBe(true)
        })

        it('should return 401 when user not found', async () => {
            const mockUser = createMockUser()
            const {
                token,
                csrfSecret,
                csrfToken
            } = createAuthenticatedRequest(mockUser)

            prismaMock.user.findUnique
                .mockResolvedValue(null)

            const response = await withCsrfAuth(
                supertest(App).delete(deleteUserEndpoint),
                token,
                csrfSecret,
                csrfToken
            )

            expect(response.status).toBe(404)
            expect(response.body.error[0].error).toContain(
                'not found'
            )
        })

        it('should return 401 for unauthenticated request',
            async () => {
                const response = await supertest(App)
                    .delete(deleteUserEndpoint)

                expect(response.status).toBe(401)
            }
        )

        it('should return 401 when CSRF token is missing',
            async () => {
                const mockUser = createMockUser()
                const {
                    token,
                    csrfSecret
                } = createAuthenticatedRequest(mockUser)

                prismaMock.user.findUnique
                    .mockResolvedValue(mockUser)

                const response = await supertest(App)
                    .delete(deleteUserEndpoint)
                    .set('Cookie', [
                        `accessToken=${token}`,
                        `_csrf=${csrfSecret}`
                    ])

                expect(response.status).toBe(401)
                expect(response.body.error[0].error).toContain(
                    'CSRF'
                )
            }
        )

        it('should return 401 when CSRF token is invalid',
            async () => {
                const mockUser = createMockUser()
                const {
                    token,
                    csrfSecret
                } = createAuthenticatedRequest(mockUser)

                prismaMock.user.findUnique
                    .mockResolvedValue(mockUser)

                const response = await supertest(App)
                    .delete(deleteUserEndpoint)
                    .set('Cookie', [
                        `accessToken=${token}`,
                        `_csrf=${csrfSecret}`
                    ])
                    .set('x-csrf-token', 'invalid-token')

                expect(response.status).toBe(401)
                expect(response.body.error[0].error).toContain(
                    'CSRF'
                )
            }
        )
    })
})