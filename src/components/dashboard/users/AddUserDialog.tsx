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
        <Button             className="flex cursor-pointer items-center px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 bg-gradient-to-r from-blue-600 to-cyan-500 hover:bg-gradient-to-r hover:from-blue-700 hover:to-cyan-600 text-white shadow-lg shadow-blue-500/25" variant="outline">
          <UserPlus className="h-4 w-4"  />
          <span>Add User</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-white rounded-lg shadow-xl h-[540px] w-[500px] p-6">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>Create a new user account and assign a role.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              value={newUser.name}
              className="border-gray-300 text-base transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 md:text-sm border focus:border-[#1B6013] focus:ring-orange-600"
              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              placeholder="John Doe"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              className="border-gray-300 text-base transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 md:text-sm border focus:border-[#1B6013] focus:ring-orange-600"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              placeholder="john@example.com"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              className="border-gray-300 text-base transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 md:text-sm border focus:border-[#1B6013] focus:ring-orange-600"
              type="password"
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              placeholder="••••••••"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="role">Role</Label>
            <Select value={newUser.role} onValueChange={(value: UserRole) => setNewUser({ ...newUser, role: value })}>
              <SelectTrigger className="bg-white border-gray-300 text-gray-900 rounded-md focus:ring-2 focus:ring-blue-600 focus:border-blue-600">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-gray-200 rounded-md shadow-lg">
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="customer">Customer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button className="cursor-pointer border-gray-300 text-gray-700 hover:bg-gray-100" variant="outline"  onClick={handleCancel}>
            Cancel
          </Button>
          <Button className='flex cursor-pointer items-center px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 bg-gradient-to-r from-blue-600 to-cyan-500 hover:bg-gradient-to-r hover:from-blue-700 hover:to-cyan-600 text-white shadow-lg shadow-blue-500/25' variant="outline" onClick={handleSubmit}>Add User</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};