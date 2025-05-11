use std::process::Command;
use std::thread;
use windows::core::PCSTR;
use windows::Win32::System::LibraryLoader::{DisableThreadLibraryCalls, GetModuleHandleA};

#[unsafe(no_mangle)]
#[allow(non_snake_case)]
extern "system" fn DllMain(
    _hinstDLL: isize,
    fdwReason: u32,
    _lpReserved: *const std::ffi::c_void,
) -> bool {
    const DLL_PROCESS_ATTACH: u32 = 1;

    if fdwReason == DLL_PROCESS_ATTACH {
        unsafe {
            DisableThreadLibraryCalls(GetModuleHandleA(PCSTR::null()).unwrap());
        }

        thread::spawn(|| {
            let frida_command = Command::new("frida")
                .arg("-n")
                .arg("GS.exe")
                .arg("-l")
                .arg(".\\universal_redirect.js")
                .spawn();

            match frida_command {
                Ok(mut child) => {
                    let _ = child.wait();
                    let _ = Command::new("taskkill")
                        .args(&["/IM", "GS.exe", "/F"])
                        .spawn();
                }
                Err(_e) => {}
            }
        });
    }

    true
}

#[unsafe(no_mangle)]
extern "system" fn GetFileVersionInfoA() {}
#[unsafe(no_mangle)]
extern "system" fn GetFileVersionInfoSizeA() {}
#[unsafe(no_mangle)]
extern "system" fn GetFileVersionInfoSizeW() {}
#[unsafe(no_mangle)]
extern "system" fn GetFileVersionInfoW() {}
#[unsafe(no_mangle)]
extern "system" fn VerQueryValueA() {}
