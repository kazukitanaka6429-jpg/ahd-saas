import { calculatePeriods } from './hospitalization'

describe('calculatePeriods', () => {
    const targetDate = new Date(2024, 3, 15) // April 2024 (0-based month 3)

    test('Case 1: Standard calculation (Start -> End)', () => {
        // 0: Prev End (Off)
        // 1: Off
        // 2: On (Start)
        // 3: On
        // 4: Off (End)
        const boolArray = new Array(32).fill(false)
        boolArray[2] = true
        boolArray[3] = true

        const result = calculatePeriods(boolArray, targetDate)

        // Expected: Start 4/2, End 4/4?
        // Logic: 
        // d=2: !prev(false) && curr(true) -> Start = 2
        // d=3: prev(true) && curr(true) -> nothing
        // d=4: prev(true) && curr(false) -> End = 4/4

        // Wait, check generic logic again.
        // If Hospitalized on 2nd and 3rd.
        // d=2 (On): Start
        // d=3 (On): Cont
        // d=4 (Off): End at 4/4? 
        // Usually "End Date" is the day status changed to OFF, or the last ON day?
        // GAS logic: "dateStr = ... d" where d is the FIRST OFF day.
        // So period is [Start, End). 

        expect(result).toHaveLength(1)
        expect(result[0]).toEqual({ start: '04/02', end: '04/04' })
    })

    test('Case 2: Continued from previous month', () => {
        // 0: Prev End (On) -> Continued
        // 1: On
        // 2: Off (End)
        const boolArray = new Array(32).fill(false)
        boolArray[0] = true
        boolArray[1] = true
        // 2 is false

        const result = calculatePeriods(boolArray, targetDate)

        // Start should be empty (continued)
        // End should be 4/2
        expect(result).toHaveLength(1)
        expect(result[0]).toEqual({ start: '', end: '04/02' })
    })

    test('Case 3: Continued to next month', () => {
        // 0: Off
        // ...
        // 30: On
        // 31: On (Last day of April is 30th usually? but array is fixed size)
        const boolArray = new Array(32).fill(false)
        boolArray[29] = true // 4/29
        boolArray[30] = true // 4/30
        // Loop goes up to len (32).
        // d=29: Start
        // d=30: On
        // d=31: Off (End at 5/1?) 
        // Wait, logic `for (let d = 1; d < boolArray.length; d++)`.
        // If array size 32. d goes 1..31.
        // If boolArray[31] is false (default).
        // Then d=31 (Off) -> End at 31 (if 30 was On).
        // 4/31 doesn't exist.

        // Correction: We need to simulate "Continued to next month".
        // If user is hospitalized on 4/30 and stays hospitalized.
        // boolArray should indicate that.
        // If `boolArray` comes from DB, it covers the whole month.
        // If the array ends with TRUE, then `currentStart` is not null after loop.

        const arr = new Array(32).fill(false)
        arr[30] = true
        // If we stop loop at 30? No, usually 31.
        // If logic relies on `boolArray` having entries for every day.

        const result = calculatePeriods(arr, targetDate)
        // If loop finishes and last was ON (or `currentStart` set), pushing { start: ..., end: '' }

        // Let's assume day 30 is ON. d=30 (Start 4/30).
        // d=31 (Off). End 4/31 ?? 
        // 4/31 is invalid date. `toMMDD` might bug out if date invalid.
        // BUT logic `calculatePeriods` handles `currentStart !== null` AFTER loop.

        // Let's make sure array represents days correctly.
        // For April, days 1..30.
        // boolArray[30] can be true. boolArray[31] should be ignored or false?
        // If we want "continued", the LOOP shouldn't close it.
        // So last element checked should be ON.

        // If array is size 31 (0..30).
        // Loop d=1..30.
        // d=30 (On). Loop ends. `currentStart` is 30.
        // After loop: push { start: '04/30', end: '' }.
        // This is Case 3.

        const arrMonth = new Array(31).fill(false) // 0..30
        arrMonth[30] = true

        const res = calculatePeriods(arrMonth, targetDate)
        expect(res).toEqual([{ start: '04/30', end: '' }])
    })

    test('Case 4: Multiple periods', () => {
        const arr = new Array(32).fill(false)
        arr[5] = true // 5th On
        // 6th Off
        arr[10] = true // 10th On
        arr[11] = true // 11th On
        // 12th Off

        const result = calculatePeriods(arr, targetDate)

        expect(result).toHaveLength(2)
        expect(result[0]).toEqual({ start: '04/05', end: '04/06' })
        expect(result[1]).toEqual({ start: '04/10', end: '04/12' })
    })
})
