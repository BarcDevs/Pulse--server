import express, { type Express } from 'express'
import path from 'path'

import { env } from '../../config'

const exposeProductionApp = (app: Express) => {
    if (env !== 'production') return

    const buildDir = path.join(
        __dirname,
        '..',
        '..',
        'client',
        'dist'
    )
    console.info('serving build resources at', buildDir)

    app.use('/', express.static(buildDir))
}

export default exposeProductionApp
