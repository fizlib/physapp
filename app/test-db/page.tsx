'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function TestDB() {
    const [status, setStatus] = useState<string>('Initializing test...')
    const [details, setDetails] = useState<string>('')
    const [color, setColor] = useState<string>('text-yellow-500')

    useEffect(() => {
        const supabase = createClient()

        async function checkConnection() {
            try {
                // Try to select from profiles. Even if empty, it shouldn't throw an error if connected.
                const { count, error } = await supabase
                    .from('profiles')
                    .select('*', { count: 'exact', head: true })

                if (error) {
                    setStatus('Connection Failed')
                    setDetails(error.message)
                    setColor('text-red-500')
                } else {
                    setStatus('Connection Successful')
                    setDetails(`Supabase is reachable. Profiles table is accessible (Count: ${count}).`)
                    setColor('text-green-500')
                }
            } catch (err: any) {
                setStatus('Client Error')
                setDetails(err.message)
                setColor('text-red-500')
            }
        }

        checkConnection()
    }, [])

    return (
        <div className="flex min-h-screen items-center justify-center p-8">
            <Card className="w-[400px]">
                <CardHeader>
                    <CardTitle>Database Connectivity</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className={`text-xl font-bold mb-2 ${color}`}>
                        {status}
                    </div>
                    <p className="text-muted-foreground text-sm">
                        {details}
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
