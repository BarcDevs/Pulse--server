import { writeFileSync } from 'fs'

import {
    changeEmailTemplate,
    confirmEmailTemplate,
    resetPasswordTemplate
} from '../src/utils/emailTemplates'

const divider = '<div style="height:40px;background:#d0d0d0;margin:0"></div>'

const html = [
    resetPasswordTemplate(123456),
    divider,
    confirmEmailTemplate(654321),
    divider,
    changeEmailTemplate(789012)
].join('\n')

writeFileSync('email-preview.html', html)
console.info('email-preview.html generated')
