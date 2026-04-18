OutFile "ARAM-Setup.exe"
InstallDir "$LOCALAPPDATA\ARAMApp"
RequestExecutionLevel user

!include "MUI2.nsh"

; Variables for checkbox state
Var CreateDesktopShortcut
Var CreateStartMenuShortcut

; Pages
!insertmacro MUI_PAGE_DIRECTORY
Page custom ShortcutOptionsPage ShortcutOptionsLeave
!insertmacro MUI_PAGE_INSTFILES

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

!insertmacro MUI_LANGUAGE "English"

; ── Shortcut Options Custom Page ──────────────────────────────────────────────
Function ShortcutOptionsPage
  nsDialogs::Create 1018
  Pop $0

  ${NSD_CreateLabel} 0 0 100% 20u "Choose additional shortcuts to create:"
  Pop $0

  ${NSD_CreateCheckbox} 10u 30u 100% 15u "Create Desktop Shortcut"
  Pop $CreateDesktopShortcut
  ${NSD_SetState} $CreateDesktopShortcut ${BST_CHECKED}   ; checked by default

  ${NSD_CreateCheckbox} 10u 50u 100% 15u "Create Start Menu Shortcut"
  Pop $CreateStartMenuShortcut
  ${NSD_SetState} $CreateStartMenuShortcut ${BST_CHECKED} ; checked by default

  nsDialogs::Show
FunctionEnd

Function ShortcutOptionsLeave
  ${NSD_GetState} $CreateDesktopShortcut  $CreateDesktopShortcut
  ${NSD_GetState} $CreateStartMenuShortcut $CreateStartMenuShortcut
FunctionEnd

; ── Install Section ───────────────────────────────────────────────────────────
Section "Install"
  SetOutPath "$INSTDIR"
  File /r "out\aram-app-win32-x64\*.*"  ; copy contents directly, not the folder itself

  ; Desktop shortcut (if checked)
  ${If} $CreateDesktopShortcut == ${BST_CHECKED}
    CreateShortcut "$DESKTOP\ARAM App.lnk" "$INSTDIR\ARAM Stats App.exe"
  ${EndIf}

  ; Start Menu shortcut (if checked)
  ${If} $CreateStartMenuShortcut == ${BST_CHECKED}
    CreateDirectory "$SMPROGRAMS\ARAM App"
    CreateShortcut "$SMPROGRAMS\ARAM App\ARAM App.lnk" "$INSTDIR\ARAM Stats App.exe"
    CreateShortcut "$SMPROGRAMS\ARAM App\Uninstall.lnk" "$INSTDIR\Uninstall.exe"
  ${EndIf}

  WriteUninstaller "$INSTDIR\Uninstall.exe"
SectionEnd

; ── Uninstall Section ─────────────────────────────────────────────────────────
Section "Uninstall"
  Delete "$DESKTOP\ARAM App.lnk"
  Delete "$SMPROGRAMS\ARAM App\ARAM App.lnk"
  Delete "$SMPROGRAMS\ARAM App\Uninstall.lnk"
  RMDir  "$SMPROGRAMS\ARAM App"
  RMDir /r "$INSTDIR"
SectionEnd