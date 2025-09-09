import React, { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { NewUser, UserRole } from '@/types/users';

export interface AddUserDialogProps {
  onAddUser: (user: NewUser) => void;
}

export const AddUserDialog: React.FC<AddUserDialogProps> = ({ onAddUser }) => {
  const [open, setOpen] = useState(false);
  const [newUser, setNewUser] = useState<NewUser>({
    name: '',
    email: '',
    password: '',
    role: 'customer',
  });

  const handleSubmit = () => {
    onAddUser(newUser);
    setOpen(false);
    setNewUser({ name: '', email: '', password: '', role: 'customer' });
  };

  const handleCancel = () => {
    setOpen(false);
    setNewUser({ name: '', email: '', password: '', role: 'customer' });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex cursor-pointer items-center gap-2 px-3 py-2 sm:px-4 sm:py-3 rounded-lg text-sm font-semibold transition-all duration-200 bg-gradient-to-r from-blue-600 to-cyan-500 hover:bg-gradient-to-r hover:from-blue-700 hover:to-cyan-600 text-white shadow-lg shadow-blue-500/25 w-full sm:w-auto">
          <UserPlus className="h-4 w-4 flex-shrink-0" />
          <span className="whitespace-nowrap">Add User</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-white rounded-lg shadow-xl w-[95vw] max-w-[500px] max-h-[90vh] p-4 sm:p-6 mx-4 sm:mx-auto overflow-y-auto">
        <DialogHeader className="space-y-2 sm:space-y-3">
          <DialogTitle className="text-lg sm:text-xl">Add New User</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Create a new user account and assign a role.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4 sm:py-6">
          <div className="grid gap-2">
            <Label htmlFor="name" className="text-sm font-medium">Full Name</Label>
            <Input
              id="name"
              value={newUser.name}
              className="!text-[16px] sm:!text-sm border-gray-300 transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border focus:border-[#1B6013] focus:ring-orange-600 h-11 sm:h-10"
              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              placeholder="John Doe"
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="email" className="text-sm font-medium">Email</Label>
            <Input
              id="email"
              type="email"
              className="!text-[16px] sm:!text-sm border-gray-300 transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border focus:border-[#1B6013] focus:ring-orange-600 h-11 sm:h-10"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              placeholder="john@example.com"
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="password" className="text-sm font-medium">Password</Label>
            <Input
              id="password"
              className="!text-[16px] sm:!text-sm border-gray-300 transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border focus:border-[#1B6013] focus:ring-orange-600 h-11 sm:h-10"
              type="password"
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              placeholder="••••••••"
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="role" className="text-sm font-medium">Role</Label>
            <Select value={newUser.role} onValueChange={(value: UserRole) => setNewUser({ ...newUser, role: value })}>
              <SelectTrigger className="bg-white border-gray-300 text-gray-900 rounded-md focus:ring-2 focus:ring-blue-600 focus:border-blue-600 h-11 sm:h-10 !text-[16px] sm:!text-sm">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-gray-200 rounded-md shadow-lg">
                <SelectItem value="admin" className="text-sm">Admin</SelectItem>
                <SelectItem value="manager" className="text-sm">Manager</SelectItem>
                <SelectItem value="customer" className="text-sm">Customer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-4 sm:pt-6">
          <Button 
            className="w-full sm:w-auto cursor-pointer border-gray-300 text-gray-700 hover:bg-gray-100 h-11 sm:h-10" 
            variant="outline" 
            onClick={handleCancel}
          >
            Cancel
          </Button>
          <Button 
            className="w-full sm:w-auto flex cursor-pointer items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 bg-gradient-to-r from-blue-600 to-cyan-500 hover:bg-gradient-to-r hover:from-blue-700 hover:to-cyan-600 text-white shadow-lg shadow-blue-500/25 h-11 sm:h-10" 
            onClick={handleSubmit}
          >
            Add User
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};