import { adminGetAllUsers, adminGetUserById } from "../actions"
import { UserList } from "../UserList"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ id?: string, page?: string, search?: string }> }) {
    const { id: selectedUserId, page: pageStr, search } = await searchParams
    const currentPage = parseInt(pageStr || '1')
    const perPage = 30
    let { users, totalCount, error } = await adminGetAllUsers(currentPage, perPage, search)

    if (selectedUserId && !error) {
        // If an ID is provided, check if the user is already in the list
        const userInList = users.find(u => u.id === selectedUserId)
        if (!userInList) {
            // If not in list (e.g. on another page), fetch them specifically
            const { user: specificUser, error: specificError } = await adminGetUserById(selectedUserId)
            if (specificUser) {
                users = [specificUser, ...users]
            } else if (specificError) {
                console.error('Error fetching specific user:', specificError)
            }
        }
    }

    if (error) {
        return (
            <div className="p-8 text-red-500">
                Klaida įkeliant naudotojus: {error}
            </div>
        )
    }

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" asChild>
                            <Link href="/admin">
                                <ArrowLeft className="h-4 w-4" />
                                <span className="sr-only">Grįžti</span>
                            </Link>
                        </Button>
                        <h1 className="text-3xl font-bold tracking-tight">Valdyti naudotojus</h1>
                    </div>
                </div>
            </div>

            <UserList
                initialUsers={users}
                selectedUserId={selectedUserId}
                totalCount={totalCount}
                currentPage={currentPage}
                perPage={perPage}
                searchQuery={search}
            />
        </div>
    )
}
