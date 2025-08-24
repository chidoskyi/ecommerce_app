import React, { useState, useEffect } from 'react';
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
import { User, UserRole, UserStatus } from '@/lib/types';

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  onSave: (user: User) => void;
}

export const EditUserDialog: React.FC<EditUserDialogProps> = ({
  open,
  onOpenChange,
  user,
  onSave,
}) => {
  const [editUser, setEditUser] = useState<User | null>(null);

  useEffect(() => {
    if (user) {
      setEditUser({ ...user });
    }
  }, [user]);

  const handleSave = () => {
    if (editUser) {
      onSave(editUser);
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    setEditUser(user ? { ...user } : null);
    onOpenChange(false);
  };

  if (!editUser) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white rounded-lg shadow-xl h-[550px] w-[500px] p-6">
        <DialogHeader>
          <DialogTitle className="text-gray-900 font-semibold">Edit User</DialogTitle>
          <DialogDescription className="text-gray-600">
            Update user information and role.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="edit-name" className="text-gray-700 font-medium">
              Full Name
            </Label>
            <Input
              id="edit-name"
              value={editUser.name}
              className="bg-white border-gray-300 text-gray-900 rounded-md focus:ring-2 focus:ring-[#1B6013] focus:border-[#1B6013]"
              onChange={(e) => setEditUser({ ...editUser, name: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-email" className="text-gray-700 font-medium">
              Email
            </Label>
            <Input
              id="edit-email"
              type="email"
              className="bg-white border-gray-300 text-gray-900 rounded-md focus:ring-2 focus:ring-[#1B6013] focus:border-[#1B6013]"
              value={editUser.email}
              onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-role" className="text-gray-700 font-medium">
              Role
            </Label>
            <Select
              value={editUser.role}
              onValueChange={(value: UserRole) => setEditUser({ ...editUser, role: value })}
            >
              <SelectTrigger className="bg-white border-gray-300 text-gray-900 rounded-md focus:ring-2 focus:ring-blue-600 focus:border-blue-600">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-gray-200 rounded-md shadow-lg">
                <SelectItem value="admin" className="hover:bg-gray-100 cursor-pointer">
                  Admin
                </SelectItem>
                <SelectItem value="manager" className="hover:bg-gray-100 cursor-pointer">
                  Manager
                </SelectItem>
                <SelectItem value="customer" className="hover:bg-gray-100 cursor-pointer">
                  Customer
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-status" className="text-gray-700 font-medium">
              Status
            </Label>
            <Select
              value={editUser.status}
              onValueChange={(value: UserStatus) => setEditUser({ ...editUser, status: value })}
            >
              <SelectTrigger className="bg-white border-gray-300 text-gray-900 rounded-md focus:ring-2 focus:ring-[#1B6013] focus:border-[#1B6013]">
                <SelectValue placeholder="Select a status" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-gray-200 rounded-md shadow-lg">
                <SelectItem value="active" className="hover:bg-gray-100 cursor-pointer">
                  Active
                </SelectItem>
                <SelectItem value="inactive" className="hover:bg-gray-100 cursor-pointer">
                  Inactive
                </SelectItem>
                <SelectItem value="suspended" className="hover:bg-gray-100 cursor-pointer">
                  Suspended
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="border-t border-gray-200 pt-4">
          <Button
            variant="outline"
            onClick={handleCancel}
            className="cursor-pointer border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="flex cursor-pointer items-center px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 bg-gradient-to-r from-blue-600 to-cyan-500 hover:bg-gradient-to-r hover:from-blue-700 hover:to-cyan-600 text-white shadow-lg shadow-blue-500/25"
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};