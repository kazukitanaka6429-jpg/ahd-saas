'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { signOut } from '@/app/actions/auth'
import { toast } from 'sonner'

// Configuration (Hardcoded as per "Simple Option")
const LOGOUT_TIMEOUT_MS = 60 * 60 * 1000 // 60 minutes
const WARNING_BEFORE_MS = 60 * 1000      // 1 minute before logout

export function AutoLogoutProvider({ children }: { children: React.ReactNode }) {
    const [showWarning, setShowWarning] = useState(false)
    const [timeLeft, setTimeLeft] = useState(WARNING_BEFORE_MS / 1000)

    // Refs to track timers without re-renders
    const logoutTimerRef = useRef<NodeJS.Timeout | null>(null)
    const warningTimerRef = useRef<NodeJS.Timeout | null>(null)
    const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null)
    const lastActivityRef = useRef<number>(Date.now())

    const handleLogout = useCallback(async () => {
        try {
            // Cleanup timers
            if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current)
            if (warningTimerRef.current) clearTimeout(warningTimerRef.current)
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)

            toast.error('タイムアウトしました。自動ログアウトしました。')
            await signOut()
        } catch (error) {
            console.error('Logout failed', error)
            // Force reload as fallback if server action fails
            window.location.href = '/login'
        }
    }, [])

    const startTimers = useCallback(() => {
        const now = Date.now()
        lastActivityRef.current = now

        // Clear existing
        if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current)
        if (warningTimerRef.current) clearTimeout(warningTimerRef.current)
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)

        setShowWarning(false)

        // Set Warning Timer (Total - WarningDuration)
        warningTimerRef.current = setTimeout(() => {
            setShowWarning(true)
            setTimeLeft(WARNING_BEFORE_MS / 1000)

            // Start countdown for UI
            countdownIntervalRef.current = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
                        return 0
                    }
                    return prev - 1
                })
            }, 1000)

        }, LOGOUT_TIMEOUT_MS - WARNING_BEFORE_MS)

        // Set Logout Timer (Total)
        logoutTimerRef.current = setTimeout(() => {
            handleLogout()
        }, LOGOUT_TIMEOUT_MS)

    }, [handleLogout])

    // Activity Handler
    const handleActivity = useCallback(() => {
        // Throttle: Only reset if warning is NOT shown (or if user explicitly continues via dialog)
        // If we are in warning state, we require explicit interaction with the dialog button
        // to prevent accidental mouse move from closing the warning unnoticed?
        // -> User requirement: "Detection of user inactivity... Warning dialog... Resume resets timer"
        // Usually, moving mouse SHOULD reset timer even if warning is shown, OR warning blocks everything.
        // Let's make it so that if Warning is shown, ONLY the button resets it (modal behavior).
        // If Warning is NOT shown, any activity resets it.

        if (!showWarning) {
            // Throttle resets to avoiding spamming timer resets (e.g. every 1s max)
            const now = Date.now()
            if (now - lastActivityRef.current > 1000) {
                startTimers()
            }
        }
    }, [showWarning, startTimers])

    // Setup Listeners
    useEffect(() => {
        // Initial start
        startTimers()

        const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']

        // Add listeners
        events.forEach(event => {
            window.addEventListener(event, handleActivity)
        })

        return () => {
            events.forEach(event => {
                window.removeEventListener(event, handleActivity)
            })
            if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current)
            if (warningTimerRef.current) clearTimeout(warningTimerRef.current)
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
        }
    }, [handleActivity, startTimers])

    const handleContinue = () => {
        startTimers()
    }

    return (
        <>
            {children}

            <AlertDialog open={showWarning}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>自動ログアウトの警告</AlertDialogTitle>
                        <AlertDialogDescription>
                            長時間操作がなかったため、セキュリティ保護のため自動ログアウトします。<br />
                            <br />
                            あと <span className="font-bold text-red-500 text-lg">{timeLeft}</span> 秒でログアウトします。
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction onClick={handleContinue}>
                            継続して利用する
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
