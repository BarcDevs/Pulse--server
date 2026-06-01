type DateWindows = {
    currentStart: Date
    currentEnd: Date
    previousStart: Date
    previousEnd: Date
}

export const calculateDateWindows = (): DateWindows => {
    const currentEnd = new Date()
    currentEnd.setHours(23, 59, 59, 999)

    const currentStart = new Date(currentEnd)
    currentStart.setDate(currentStart.getDate() - 6)
    currentStart.setHours(0, 0, 0, 0)

    const previousEnd = new Date(currentStart)
    previousEnd.setTime(previousEnd.getTime() - 1)

    const previousStart = new Date(previousEnd)
    previousStart.setDate(previousStart.getDate() - 6)
     
    previousStart.setHours(0, 0, 0, 0)

    return {
        currentStart,
        currentEnd,
        previousStart,
        previousEnd
    }
}
