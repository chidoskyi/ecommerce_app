import React from 'react';
import { useDispatch } from 'react-redux';
import { MoreHorizontal, Check, X, Trash2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, UserStatus } from '@/types/users';
import {
  setSelectedUser,
  deleteUser,
  updateUser
} from '@/app/store/slices/adminUsersSlice';
import { AppDispatch } from '@/app/store';

export interface UserActionsProps {
  user: User;
  onEdit?: () => void; // Optional callback for opening edit dialog
}

export const UserActions: React.FC<UserActionsProps> = ({
  user,
  onEdit,
}) => {
  const dispatch = useDispatch<AppDispatch>();

  const handleEdit = () => {
    // Set the selected user in Redux state
    dispatch(setSelectedUser(user));
    // Call optional callback to open dialog
    if (onEdit) {
      onEdit();
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete ${user.name}?`)) {
      try {
        await dispatch(deleteUser(user.id)).unwrap();
        // Success handled by Redux state updates
      } catch (error) {
        console.error('Failed to delete user:', error);
        // You might want to show an error toast here
      }
    }
  };

  const handleStatusChange = async () => {
    const newStatus: UserStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    
    try {
      await dispatch(updateUser({
        userId: user.id,
        userData: { status: newStatus }
      })).unwrap();
      // Success handled by Redux state updates
    } catch (error) {
      console.error('Failed to update user status:', error);
      // You might want to show an error toast here
    }
  };

  const handleSuspendUser = async () => {
    if (user.status === 'SUSPENDED') {
      // Reactivate user
      await handleStatusChange();
    } else {
      // Suspend user
      try {
        await dispatch(updateUser({
          userId: user.id,
          userData: { status: 'SUSPENDED' }
        })).unwrap();
      } catch (error) {
        console.error('Failed to suspend user:', error);
      }
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="cursor-pointer">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-white shadow-md border-none">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        
        <DropdownMenuItem onClick={handleEdit} className="cursor-pointer">
          <Edit className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        {/* Status Toggle */}
        <DropdownMenuItem
          onClick={handleStatusChange}
          className="cursor-pointer"
        >
          {user.status === 'ACTIVE' ? (
            <>
              <X className="mr-2 h-4 w-4" />
              Deactivate
            </>
          ) : user.status === 'INACTIVE' ? (
            <>
              <Check className="mr-2 h-4 w-4" />
              Activate
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              Reactivate
            </>
          )}
        </DropdownMenuItem>

        {/* Suspend/Unsuspend Option */}
        {user.status !== 'INACTIVE' && (
          <DropdownMenuItem
            onClick={handleSuspendUser}
            className="cursor-pointer text-orange-600"
          >
            {user.status === 'SUSPENDED' ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Unsuspend
              </>
            ) : (
              <>
                <X className="mr-2 h-4 w-4" />
                Suspend
              </>
            )}
          </DropdownMenuItem>
        )}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          className="text-red-600 cursor-pointer" 
          onClick={handleDelete}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};