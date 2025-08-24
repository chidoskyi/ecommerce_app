import React from 'react';
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
import { UserActionsProps } from '@/lib/types';

export const UserActions: React.FC<UserActionsProps> = ({
  user,
  onEdit,
  onDelete,
  onStatusChange,
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-white shadow-md border-none">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => onEdit(user)} className="cursor-pointer">
          <Edit className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem >
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() =>
            onStatusChange(user.id, user.status === 'active' ? 'inactive' : 'active')
          }
          className="cursor-pointer"
        >
          {user.status === 'active' ? (
            <>
              <X className="mr-2 h-4 w-4" />
              Deactivate
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              Activate
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-red-600 cursor-pointer" onClick={() => onDelete(user.id)}>
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};