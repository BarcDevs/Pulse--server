import supertest from 'supertest'

import { serverConfig } from '../../../config'
import App from '../../app'
import { HttpStatusCodes } from '../../constants/httpStatusCodes'

const endpoint = `/api/${serverConfig.apiVersion}/dev/email-preview`

describe('GET /dev/email-preview', () => {
    it('renders the delete-account email with the logo inlined', async () => {
        const response = await supertest(App)
            .get(endpoint)
            .query({ type: 'delete-account', lang: 'en' })

        expect(response.status).toBe(HttpStatusCodes.OK)
        expect(response.text).toContain('confirm deleting your Pulse account')
        expect(response.text).toContain('data:image/png;base64,')
        expect(response.text).not.toContain('cid:')
    })

    it('renders the Hebrew version', async () => {
        const response = await supertest(App)
            .get(endpoint)
            .query({ type: 'delete-account', lang: 'he' })

        expect(response.status).toBe(HttpStatusCodes.OK)
        expect(response.text).toContain('מחיקת החשבון')
    })
})
