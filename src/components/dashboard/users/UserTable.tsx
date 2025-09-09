import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, UserRole, UserStatus } from '@/types/users';
import { UserActions } from '@/components/dashboard/users/UserActions';
import {
  selectUsers,
  selectLoading,
  selectSearchTerm,
  setSearchTerm,
} from '@/app/store/slices/adminUsersSlice';
import { AppDispatch } from '@/app/store';

interface UserTableProps {
  onEdit?: () => void;
}

export const UserTable: React.FC<UserTableProps> = ({ onEdit }) => {
  const dispatch = useDispatch<AppDispatch>();
  const users = useSelector(selectUsers);
  const loading = useSelector(selectLoading);
  const searchTerm = useSelector(selectSearchTerm);

  const handleSearchChange = (value: string) => {
    dispatch(setSearchTerm(value));
  };

  // Filter users based on search term
  const filteredUsers = users.filter(
    (user) => {
      const searchLower = searchTerm.toLowerCase();
      const fullName = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase();
      return (
        fullName.includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower) ||
        user.role.toLowerCase().includes(searchLower)
      );
    }
  );

  const getRoleBadgeColor = (role: UserRole): string => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'USER':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'MODERATOR':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getStatusBadgeColor = (status: UserStatus): string => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'INACTIVE':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      case 'SUSPENDED':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const formatDateMobile = (dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: '2-digit',
    }).format(date);
  };

  const getDisplayName = (user: User): string => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.fullName || user.email;
  };

  const getInitials = (user: User): string => {
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user.fullName) {
      return user.fullName
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase();
    }
    return user.email[0].toUpperCase();
  };

  return (
    <>
      {/* Search Section */}
      <div className="pb-4 px-2 sm:px-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search users..."
            className="!text-[16px] sm:!text-sm border-gray-300 transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border pl-10 sm:pl-10 h-11 sm:h-10 focus:border-[#1B6013] focus:ring-orange-600"
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
      </div>
      
      {/* Desktop Table */}
      <div className="hidden md:block rounded-md border border-gray-200 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10">
                  {searchTerm ? `No users found matching "${searchTerm}"` : 'No users found'}
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src={`https://ui-avatars.com/api/?name=${encodeURIComponent(getDisplayName(user))}&background=random`}
                        />
                        <AvatarFallback className="text-xs">
                          {getInitials(user)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-sm">{getDisplayName(user)}</div>
                        <div className="text-xs text-muted-foreground">{user.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${getRoleBadgeColor(user.role)} text-xs`} variant="outline">
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${getStatusBadgeColor(user.status)} text-xs`} variant="outline">
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {user.createdAt ? formatDate(user.createdAt) : 'Never'}
                  </TableCell>
                  <TableCell className="text-right">
                    <UserActions user={user} onEdit={onEdit} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card Layout */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-lg border border-gray-200 mx-2">
            <p className="text-muted-foreground">
              {searchTerm ? `No users found matching "${searchTerm}"` : 'No users found'}
            </p>
          </div>
        ) : (
          filteredUsers.map((user) => (
            <div key={user.id} className="bg-white rounded-lg border border-gray-200 p-4 mx-2 shadow-sm">
              {/* User Info */}
              <div className="flex items-center gap-3 mb-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(getDisplayName(user))}&background=random`}
                  />
                  <AvatarFallback className="text-sm">
                    {getInitials(user)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{getDisplayName(user)}</div>
                  <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                </div>
                <div className="flex-shrink-0">
                  <UserActions user={user} onEdit={onEdit} />
                </div>
              </div>

              {/* Badges and Date */}
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <Badge className={`${getRoleBadgeColor(user.role)} text-xs`} variant="outline">
                  {user.role}
                </Badge>
                <Badge className={`${getStatusBadgeColor(user.status)} text-xs`} variant="outline">
                  {user.status}
                </Badge>
              </div>

              {/* Created Date */}
              <div className="text-xs text-muted-foreground">
                Created: {user.createdAt ? formatDateMobile(user.createdAt) : 'Never'}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
};