"use client";

import dynamic from "next/dynamic";

const ProfileMenu = dynamic(() => import("./ProfileMenu"), { ssr: false });

export default ProfileMenu;