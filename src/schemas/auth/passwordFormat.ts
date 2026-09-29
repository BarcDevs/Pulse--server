import { z } from 'zod'

// Login and current-password checks only. A stricter rule there would lock
// out existing users, so new passwords use newPasswordField below
export const PASSWORD_FORMAT =
    /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/

export const STRONG_PASSWORD_FORMAT =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/

const SIMPLE_RUN_LENGTH = 4

/** True if the password has 4+ repeated (aaaa, 1111) or sequential
 * (abcd, 4321) characters in a row. Mirrors the client rule. */
export const hasSimpleRun = (password: string): boolean => {
    const chars = password.toLowerCase()

    for (let i = 0; i + SIMPLE_RUN_LENGTH <= chars.length; i++) {
        const run = chars.slice(i, i + SIMPLE_RUN_LENGTH)

        if (/^(.)\1+$/.test(run)) return true
        if (!/^([a-z]+|\d+)$/.test(run)) continue

        const steps = [...run]
            .slice(1)
            .map((char, j) => char.charCodeAt(0) - run.charCodeAt(j))

        if (steps.every((step) => step === 1)) return true
        if (steps.every((step) => step === -1)) return true
    }

    return false
}

// Signup, reset and change password
export const newPasswordField = (requiredMessage: string) =>
    z.string(requiredMessage)
        .min(8, 'Password must be at least 8 characters')
        .regex(
            STRONG_PASSWORD_FORMAT,
            'Password must include an uppercase letter, a lowercase letter and a number'
        )
        .refine(
            (password) => !hasSimpleRun(password),
            'Password must not contain 4 or more repeated or sequential characters (like 1234, abcd or aaaa)'
        )
