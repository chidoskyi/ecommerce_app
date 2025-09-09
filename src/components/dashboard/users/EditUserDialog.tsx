import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { User, UserRole, UserStatus } from '@/types/users';
import {
  selectSelectedUser,
  updateUser,
  setSelectedUser,
} from '@/app/store/slices/adminUsersSlice';
import { AppDispatch } from '@/app/store';

export interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditUserDialog: React.FC<EditUserDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const selectedUser = useSelector(selectSelectedUser);
  const [editUser, setEditUser] = useState<User | null>(null);

  useEffect(() => {
    if (selectedUser && open) {
      setEditUser({ ...selectedUser });
    }
  }, [selectedUser, open]);

  const handleSave = async () => {
    if (editUser && selectedUser) {
      try {
        // Prepare the user data for update
        const userData: Partial<User> = {
          firstName: editUser.firstName,
          lastName: editUser.lastName,
          email: editUser.email,
          role: editUser.role,
          status: editUser.status,
        };

        await dispatch(updateUser({
          userId: selectedUser.id,
          userData
        })).unwrap();

        // Close dialog and clear selected user
        onOpenChange(false);
        dispatch(setSelectedUser(null));
        setEditUser(null);
      } catch (error) {
        console.error('Failed to update user:', error);
        // You might want to show an error toast here
      }
    }
  };

  const handleCancel = () => {
    setEditUser(selectedUser ? { ...selectedUser } : null);
    onOpenChange(false);
    dispatch(setSelectedUser(null));
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      dispatch(setSelectedUser(null));
      setEditUser(null);
    }
    onOpenChange(open);
  };

  if (!editUser) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-white rounded-lg shadow-xl w-[95vw] max-w-[500px] max-h-[90vh] p-4 sm:p-6 mx-4 sm:mx-auto overflow-y-auto">
        <DialogHeader className="space-y-2 sm:space-y-3">
          <DialogTitle className="text-gray-900 font-semibold text-lg sm:text-xl">
            Edit User
          </DialogTitle>
          <DialogDescription className="text-gray-600 text-sm">
            Update user information and role.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4 sm:py-6">
          <div className="grid gap-2">
            <Label htmlFor="edit-firstName" className="text-gray-700 font-medium text-sm">
              First Name
            </Label>
            <Input
              id="edit-firstName"
              value={editUser.firstName || ''}
              className="!text-[16px] sm:!text-sm bg-white border-gray-300 text-gray-900 rounded-md focus:ring-2 focus:ring-[#1B6013] focus:border-[#1B6013] h-11 sm:h-10"
              onChange={(e) => setEditUser({ ...editUser, firstName: e.target.value })}
              placeholder="Enter first name"
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="edit-lastName" className="text-gray-700 font-medium text-sm">
              Last Name
            </Label>
            <Input
              id="edit-lastName"
              value={editUser.lastName || ''}
              className="!text-[16px] sm:!text-sm bg-white border-gray-300 text-gray-900 rounded-md focus:ring-2 focus:ring-[#1B6013] focus:border-[#1B6013] h-11 sm:h-10"
              onChange={(e) => setEditUser({ ...editUser, lastName: e.target.value })}
              placeholder="Enter last name"
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="edit-email" className="text-gray-700 font-medium text-sm">
              Email
            </Label>
            <Input
              id="edit-email"
              type="email"
              className="!text-[16px] sm:!text-sm bg-white border-gray-300 text-gray-900 rounded-md focus:ring-2 focus:ring-[#1B6013] focus:border-[#1B6013] h-11 sm:h-10"
              value={editUser.email}
              onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
              placeholder="Enter email address"
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="edit-role" className="text-gray-700 font-medium text-sm">
              Role
            </Label>
            <Select
              value={editUser.role}
              onValueChange={(value: UserRole) => setEditUser({ ...editUser, role: value })}
            >
              <SelectTrigger className="!text-[16px] sm:!text-sm bg-white border-gray-300 text-gray-900 rounded-md focus:ring-2 focus:ring-blue-600 focus:border-blue-600 h-11 sm:h-10">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-gray-200 rounded-md shadow-lg">
                <SelectItem value="ADMIN" className="hover:bg-gray-100 cursor-pointer text-sm">
                  Admin
                </SelectItem>
                <SelectItem value="MODERATOR" className="hover:bg-gray-100 cursor-pointer text-sm">
                  Moderator
                </SelectItem>
                <SelectItem value="USER" className="hover:bg-gray-100 cursor-pointer text-sm">
                  User
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="edit-status" className="text-gray-700 font-medium text-sm">
              Status
            </Label>
            <Select
              value={editUser.status}
              onValueChange={(value: UserStatus) => setEditUser({ ...editUser, status: value })}
            >
              <SelectTrigger className="!text-[16px] sm:!text-sm bg-white border-gray-300 text-gray-900 rounded-md focus:ring-2 focus:ring-[#1B6013] focus:border-[#1B6013] h-11 sm:h-10">
                <SelectValue placeholder="Select a status" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-gray-200 rounded-md shadow-lg">
                <SelectItem value="ACTIVE" className="hover:bg-gray-100 cursor-pointer text-sm">
                  Active
                </SelectItem>
                <SelectItem value="INACTIVE" className="hover:bg-gray-100 cursor-pointer text-sm">
                  Inactive
                </SelectItem>
                <SelectItem value="SUSPENDED" className="hover:bg-gray-100 cursor-pointer text-sm">
                  Suspended
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 border-t border-gray-200 pt-4 sm:pt-6">
          <Button
            variant="outline"
            onClick={handleCancel}
            className="w-full sm:w-auto cursor-pointer border-gray-300 text-gray-700 hover:bg-gray-100 h-11 sm:h-10"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="w-full sm:w-auto flex cursor-pointer items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 bg-gradient-to-r from-blue-600 to-cyan-500 hover:bg-gradient-to-r hover:from-blue-700 hover:to-cyan-600 text-white shadow-lg shadow-blue-500/25 h-11 sm:h-10"
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};