"use client";
import {createContext,useContext,type ReactNode} from "react";
const Access=createContext<{permissions:string[];readOnly:boolean}>({permissions:["owner"],readOnly:false});
export function AdminAccess({permissions,readOnly,children}:{permissions:string[];readOnly:boolean;children:ReactNode}){return <Access.Provider value={{permissions,readOnly}}>{children}</Access.Provider>;}
export function useAdminAccess(){const access=useContext(Access);return {...access,can:(permission:string)=>access.permissions.includes("owner")||access.permissions.includes(permission)};}
