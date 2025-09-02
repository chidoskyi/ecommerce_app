'use client';

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'react-toastify';
import { UserTable } from '@/components/dashboard/users/UserTable';
import { AddUserDialog } from '@/components/dashboard/users/AddUserDialog';
import { EditUserDialog } from '@/components/dashboard/users/EditUserDialog';
import {
  fetchUsers,
  selectUsers,
  selectLoading,
  selectError,
  selectSelectedUser,
  setSelectedUser,
  clearErrors,
} from '@/app/store/slices/adminUsersSlice';
import { AppDispatch } from '@/app/store';

const UsersPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const users = useSelector(selectUsers);
  const loading = useSelector(selectLoading);
  const error = useSelector(selectError);
  const selectedUser = useSelector(selectSelectedUser);
  
  const [isEditUserOpen, setIsEditUserOpen] = useState<boolean>(false);

  // Fetch users on component mount
  useEffect(() => {
    dispatch(fetchUsers());
  }, [dispatch]);

  // Handle errors with toast notifications
  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearErrors());
    }
  }, [error, dispatch]);

  // Handle edit dialog state based on selected user
  useEffect(() => {
    if (selectedUser && !isEditUserOpen) {
      setIsEditUserOpen(true);
    } else if (!selectedUser && isEditUserOpen) {
      setIsEditUserOpen(false);
    }
  }, [selectedUser, isEditUserOpen]);

  const handleAddUser = async (newUser: any): Promise<void> => {
    try {
      // Validate form
      if (!newUser.firstName || !newUser.lastName || !newUser.email) {
        toast.error('Please fill all required fields');
        return;
      }

      // In a real app, you would dispatch a createUser action
      // For now, we'll just refresh the users list after mock creation
      // await dispatch(createUser(newUser)).unwrap();
      
      // Mock success for demonstration
      toast.success('User added successfully');
      // Refresh users list
      dispatch(fetchUsers());
    } catch (error) {
      console.error('Error adding user:', error);
      toast.error('Failed to add user');
    }
  };

  const handleEditUserOpen = () => {
    setIsEditUserOpen(true);
  };

  const handleEditUserClose = () => {
    setIsEditUserOpen(false);
    // Clear selected user when dialog closes
    if (selectedUser) {
      dispatch(setSelectedUser(null));
    }
  };

  const handleRefresh = () => {
    dispatch(fetchUsers());
  };

  return (
    <div className="p-0 md:p-6">
      <div className="flex flex-col space-y-6">
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">Manage users and their roles in the system</p>
        </div>

        <div className="flex flex-col space-y-4">
          <Card className="shadow-md border-none">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <CardTitle>Users</CardTitle>
                  <button
                    onClick={handleRefresh}
                    className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                    disabled={loading}
                  >
                    {loading ? 'Loading...' : 'Refresh'}
                  </button>
                </div>
                {/* <AddUserDialog onAddUser={handleAddUser} /> */}
              </div>
              <CardDescription>
                View and manage user accounts ({users.length} users)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UserTable onEdit={handleEditUserOpen} />
            </CardContent>
          </Card>
        </div>
      </div>

      <EditUserDialog
        open={isEditUserOpen}
        onOpenChange={handleEditUserClose}
      />
    </div>
  );
};

export default UsersPage;