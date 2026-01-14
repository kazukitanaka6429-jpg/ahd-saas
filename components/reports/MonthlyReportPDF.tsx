'use client'

import React from 'react'
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'
import { MonthlyReportData, DailyRecordForReport } from '@/app/actions/reports/get-monthly-records'

// Register Japanese Font
Font.register({
    family: 'NotoSansJP',
    fonts: [
        { src: 'https://raw.githubusercontent.com/google/fonts/main/ofl/notosansjp/NotoSansJP-Regular.ttf' },
        { src: 'https://raw.githubusercontent.com/google/fonts/main/ofl/notosansjp/NotoSansJP-Bold.ttf', fontWeight: 'bold' }
    ]
});

const styles = StyleSheet.create({
    page: {
        padding: 30,
        fontSize: 9,
        fontFamily: 'NotoSansJP',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#000',
        paddingBottom: 5,
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    meta: {
        fontSize: 10,
    },
    table: {
        display: 'flex',
        width: 'auto',
        borderStyle: 'solid',
        borderWidth: 1,
        borderColor: '#bfbfbf',
        borderRightWidth: 0,
        borderBottomWidth: 0,
    },
    tableRow: {
        margin: 'auto',
        flexDirection: 'row',
    },
    tableColHeader: {
        width: '14%', // Adjust widths
        borderStyle: 'solid',
        borderWidth: 1,
        borderLeftWidth: 0,
        borderTopWidth: 0,
        borderColor: '#bfbfbf',
        backgroundColor: '#f0f0f0',
        padding: 2,
        alignItems: 'center',
    },
    tableCol: {
        width: '14%',
        borderStyle: 'solid',
        borderWidth: 1,
        borderLeftWidth: 0,
        borderTopWidth: 0,
        borderColor: '#bfbfbf',
        padding: 2,
    },
    cellText: {
        fontSize: 8,
    }
});

interface Props {
    data: MonthlyReportData
}

export const MonthlyReportPDF = ({ data }: Props) => {
    const daysInMonth = new Date(data.year, data.month, 0).getDate()
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.title}>業務日誌 月間サマリー</Text>
                        <Text style={styles.meta}>対象年月: {data.year}年{data.month}月</Text>
                    </View>
                    <View>
                        <Text style={styles.meta}>利用者名: {data.resident.name} 様</Text>
                        <Text style={styles.meta}>施設名: {data.facility.name}</Text>
                    </View>
                </View>

                {/* Table Header */}
                <View style={styles.table}>
                    <View style={styles.tableRow}>
                        <View style={{ ...styles.tableColHeader, width: '8%' }}><Text>日付</Text></View>
                        <View style={styles.tableColHeader}><Text>バイタル</Text></View>
                        <View style={styles.tableColHeader}><Text>食事(朝/昼/夕)</Text></View>
                        <View style={styles.tableColHeader}><Text>排泄</Text></View>
                        <View style={styles.tableColHeader}><Text>入浴</Text></View>
                        <View style={{ ...styles.tableColHeader, width: '28%' }}><Text>特記事項</Text></View>
                    </View>

                    {/* Table Body */}
                    {days.map(day => {
                        const dateStr = `${data.year}-${String(data.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                        const record = data.records[dateStr]
                        const d = record?.data || {}

                        // Format Vital
                        const vital = []
                        if (d.bt) vital.push(`KT: ${d.bt}`)
                        if (d.bp_h || d.bp_l) vital.push(`BP: ${d.bp_h}/${d.bp_l}`)
                        if (d.pulse) vital.push(`P: ${d.pulse}`)
                        if (d.spo2) vital.push(`SpO2: ${d.spo2}`)

                        // Format Meal
                        const meal = []
                        meal.push(`朝: ${d.meal_breakfast_amount || '-'}%`)
                        meal.push(`昼: ${d.meal_lunch_amount || '-'}%`)
                        meal.push(`夕: ${d.meal_dinner_amount || '-'}%`)

                        // Format Excretion (Simplified)
                        const exc = []
                        if (d.urination_count) exc.push(`尿:${d.urination_count}回`)
                        if (d.defecation_count) exc.push(`便:${d.defecation_count}回`)

                        return (
                            <View style={styles.tableRow} key={day}>
                                <View style={{ ...styles.tableCol, width: '8%' }}>
                                    <Text style={styles.cellText}>{day}日</Text>
                                </View>
                                <View style={styles.tableCol}>
                                    <Text style={styles.cellText}>{vital.join('\n')}</Text>
                                </View>
                                <View style={styles.tableCol}>
                                    <Text style={styles.cellText}>{meal.join('\n')}</Text>
                                </View>
                                <View style={styles.tableCol}>
                                    <Text style={styles.cellText}>{exc.join('\n')}</Text>
                                </View>
                                <View style={styles.tableCol}>
                                    <Text style={styles.cellText}>{d.bath_type || ''}</Text>
                                </View>
                                <View style={{ ...styles.tableCol, width: '28%' }}>
                                    <Text style={styles.cellText}>{d.notes || ''}</Text>
                                </View>
                            </View>
                        )
                    })}
                </View>
            </Page>
        </Document>
    )
}
