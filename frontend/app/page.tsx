import { AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar } from "@radix-ui/react-avatar";
import { MoreHorizontal } from "lucide-react";
import Link from "next/link";

const invoices = [
  {
    avatar: "https://github.com/shadcn.png",
    name: "Paid",
    totalAmount: "$250.00",
    paymentMethod: "Credit Card",
  },
  {
    avatar: "https://github.com/shadcn.png",
    name: "Pending",
    totalAmount: "$150.00",
    paymentMethod: "PayPal",
  },
  {
    avatar: "https://github.com/shadcn.png",
    name: "Unpaid",
    totalAmount: "$350.00",
    paymentMethod: "Bank Transfer",
  },
  {
    avatar: "https://github.com/shadcn.png",
    name: "Paid",
    totalAmount: "$450.00",
    paymentMethod: "Credit Card",
  },
  {
    avatar: "https://github.com/shadcn.png",
    name: "Paid",
    totalAmount: "$550.00",
    paymentMethod: "PayPal",
  },
  {
    avatar: "https://github.com/shadcn.png",
    name: "Pending",
    totalAmount: "$200.00",
    paymentMethod: "Bank Transfer",
  },
  {
    avatar: "https://github.com/shadcn.png",
    name: "Unpaid",
    totalAmount: "$300.00",
    paymentMethod: "Credit Card",
  },
]

export default function Home() {
  return (
    <div className="flex-col items-center gap-x-5 sticky w-full top-4 py-2 px-4 rounded-2xl shadow-3xl z-40 bg-white">
      <div className="flex items-center gap-x-5 sticky w-full top-4 py-2 px-4 rounded-2xl shadow-3xl z-40">
        <Link className="text-3xl font-extrabold text-nowrap text-black" href="/">
          Video Call
        </Link>

        <div className="flex w-full items-center gap-2 rounded-2xl">
          <div className="absolute w-full flex items-center ps-3 pointer-events-none">
            <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z" />
            </svg>
          </div>
          <input className="rounded-2xl block w-full h-10 p-2 ps-10 text-sm text-gray-900 border border-gray-300 bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder="Tìm kiếm " required />
        </div>
        <div className="flex h-auto  rounded-full ">
          <Avatar className="h-20 w-20">
            <AvatarImage className="rounded-full h-20 w-20" src="https://github.com/shadcn.png" />
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>
        </div>
      </div>
      <div className="flex w-full">
        <Dialog>
          <DialogTrigger asChild>
            <Button className="items-end" variant="outline">Thêm Liên Hệ</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Thông tin liên hệ</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="flex w-full items-center gap-2 rounded-2xl">
                <div className="absolute w-full flex items-center ps-3 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z" />
                  </svg>
                </div>
                <input className="rounded-2xl block w-full h-10 p-2 ps-10 text-sm text-gray-900 border border-gray-300 bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder="" required />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Thêm</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]"></TableHead>
            <TableHead>Tên Tài Khoản</TableHead>
            <TableHead></TableHead>
            <TableHead className="text-right"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice) => (
            <TableRow key={invoice.name} className="">
              <TableCell className="font-medium">
                <Avatar className="h-12 w-12">
                  <AvatarImage className="rounded-full h-12 w-12" src={invoice.avatar} />
                  <AvatarFallback>CN</AvatarFallback>
                </Avatar>
              </TableCell>
              <TableCell>{invoice.name}</TableCell>
              <TableCell className="text-right gap-5">
                <Button className="bg-green-500">
                  <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="videocall.svg" fill="none" viewBox="0 0 20 20">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z" />
                  </svg>
                  Gọi
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>Xóa</DropdownMenuItem>
                    <DropdownMenuItem>Chỉnh sửa</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
