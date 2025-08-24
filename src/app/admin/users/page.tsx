'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'react-toastify';
import { User, NewUser, UserStatus } from '@/lib/types';
import { UserTable } from '@/components/dashboard/users/UserTable';
import { AddUserDialog } from '@/components/dashboard/users/AddUserDialog';
import { EditUserDialog } from '@/components/dashboard/users/EditUserDialog';

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isEditUserOpen, setIsEditUserOpen] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Fetch users on component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async (): Promise<void> => {
    setLoading(true);
    try {
      // In a real app, you would fetch from your API
      // const response = await api.getUsers()
      // setUsers(response.data)

      // Mock data for demonstration
      const mockUsers: User[] = [
        {
          id: 1,
          name: 'John Doe',
          email: 'john@example.com',
          role: 'admin',
          status: 'active',
          lastLogin: '2023-05-15T10:30:00',
        },
        {
          id: 2,
          name: 'Jane Smith',
          email: 'jane@example.com',
          role: 'customer',
          status: 'active',
          lastLogin: '2023-05-14T14:45:00',
        },
        {
          id: 3,
          name: 'Robert Johnson',
          email: 'robert@example.com',
          role: 'customer',
          status: 'inactive',
          lastLogin: '2023-04-30T09:15:00',
        },
        {
          id: 4,
          name: 'Emily Davis',
          email: 'emily@example.com',
          role: 'manager',
          status: 'active',
          lastLogin: '2023-05-16T08:20:00',
        },
        {
          id: 5,
          name: 'Michael Wilson',
          email: 'michael@example.com',
          role: 'customer',
          status: 'active',
          lastLogin: '2023-05-10T16:30:00',
        },
      ];
      
      setUsers(mockUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (newUser: NewUser): Promise<void> => {
    try {
      // Validate form
      if (!newUser.name || !newUser.email || !newUser.password) {
        toast.error('Please fill all required fields');
        return;
      }

      // In a real app, you would call your API
      // const response = await api.createUser(newUser)

      // Mock adding a user
      const mockUser: User = {
        id: users.length + 1,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        status: 'active',
        lastLogin: new Date().toISOString(),
      };

      setUsers([...users, mockUser]);
      toast.success('User added successfully');
    } catch (error) {
      console.error('Error adding user:', error);
      toast.error('Failed to add user');
    }
  };

  const handleEditUser = async (updatedUser: User): Promise<void> => {
    try {
      // In a real app, you would call your API
      // await api.updateUser(updatedUser.id, updatedUser)

      // Mock updating a user
      const updatedUsers = users.map((user) =>
        user.id === updatedUser.id ? updatedUser : user
      );

      setUsers(updatedUsers);
      setCurrentUser(null);
      toast.success('User updated successfully');
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Failed to update user');
    }
  };

  const handleDeleteUser = async (userId: number): Promise<void> => {
    try {
      // In a real app, you would call your API
      // await api.deleteUser(userId)

      // Mock deleting a user
      const updatedUsers = users.filter((user) => user.id !== userId);
      setUsers(updatedUsers);
      toast.success('User deleted successfully');
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    }
  };

  const handleStatusChange = async (userId: number, newStatus: UserStatus): Promise<void> => {
    try {
      // In a real app, you would call your API
      // await api.updateUserStatus(userId, newStatus)

      // Mock updating user status
      const updatedUsers = users.map((user) =>
        user.id === userId ? { ...user, status: newStatus } : user
      );

      setUsers(updatedUsers);
      toast.success(`User status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating user status:', error);
      toast.error('Failed to update user status');
    }
  };

  const handleEditClick = (user: User): void => {
    setCurrentUser(user);
    setIsEditUserOpen(true);
  };

  return (
 <div className="p-0 md:p-6">
      <div className="flex flex-col space-y-6">
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">Manage users and their roles in the system</p>
        </div>

        <div className="flex flex-col space-y-4">
          <Card className='shadow-md border-none'>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>Users</CardTitle>
                <AddUserDialog onAddUser={handleAddUser} />
              </div>
              <CardDescription>View and manage user accounts</CardDescription>
            </CardHeader>
            <CardContent>
              <UserTable
                users={users}
                loading={loading}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onEdit={handleEditClick}
                onDelete={handleDeleteUser}
                onStatusChange={handleStatusChange}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <EditUserDialog
        open={isEditUserOpen}
        onOpenChange={setIsEditUserOpen}
        user={currentUser}
        onSave={handleEditUser}
      />
    </div>
  );
};

export default UsersPage;


