; ============================================================================
; installer.nsh — RepoPrep (electron-builder custom NSIS script)
;
; Injected into the generated NSIS script via the `nsis.include` build option.
;
; Custom macros provided by electron-builder:
;   customPageAfterChangeDir — inserted after the "Choose Install Location"
;                              page and before InstFiles (assisted mode only)
;   customInstall            — runs once during installation
;   customUnInstall          — runs once during uninstallation
;
; Resulting assisted-installer page flow:
;   1. License (MUI_PAGE_LICENSE, from nsis.license)
;   2. Choose Install Location (MUI_PAGE_DIRECTORY)
;   3. Setup Options (custom page below: desktop / Start Menu / taskbar)
;   4. Installing (MUI_PAGE_INSTFILES)
;   5. Finish
;
; Shortcut creation is fully handled by this script (electron-builder is told
; via nsis.createDesktopShortcut/createStartMenuShortcut = false), so the
; options chosen here are honored on both fresh installs and silent /S runs.
; ============================================================================

; ----------------------------------------------------------------------------
; Share the option values between the installer and uninstaller builds.
; Values are "1" (checked) / "0" (unchecked) / "" (page never shown — treat
; as ON so silent /S installs keep the defaults).
;
; Only the installer build uses them: customUnInstall removes shortcuts
; unconditionally, so declaring them unconditionally would make the uninstaller
; compile fail under electron-builder's makensis -WX (warning-as-error).
; ----------------------------------------------------------------------------
!ifndef BUILD_UNINSTALLER
  Var /GLOBAL optDesktop
  Var /GLOBAL optStartMenu
  Var /GLOBAL optTaskbar
  Var /GLOBAL optDesktopCtl
  Var /GLOBAL optStartMenuCtl
  Var /GLOBAL optTaskbarCtl
!endif

; ----------------------------------------------------------------------------
; Localized strings for the custom "Setup Options" page.
; Language IDs are raw LCIDs (1033 en-US, 1025 ar-SA, 1049 ru-RU, 2052 zh-CN),
; matching the lcid table used by electron-builder's own LangString emission,
; so no dependency on the MUI_LANGUAGE load order.
; ----------------------------------------------------------------------------
LangString OPT_PAGE_TITLE 1033 "Setup Options"
LangString OPT_PAGE_TITLE 1025 "خيارات الإعداد"
LangString OPT_PAGE_TITLE 1049 "Параметры установки"
LangString OPT_PAGE_TITLE 2052 "安装选项"

LangString OPT_PAGE_SUBTITLE 1033 "Choose the shortcuts RepoPrep should create."
LangString OPT_PAGE_SUBTITLE 1025 "اختر الاختصارات التي يجب أن ينشئها RepoPrep."
LangString OPT_PAGE_SUBTITLE 1049 "Выберите ярлыки, которые должен создать RepoPrep."
LangString OPT_PAGE_SUBTITLE 2052 "选择 RepoPrep 应创建的快捷方式。"

LangString OPT_PAGE_LABEL 1033 "Additional shortcuts:"
LangString OPT_PAGE_LABEL 1025 "اختصارات إضافية:"
LangString OPT_PAGE_LABEL 1049 "Дополнительные ярлыки:"
LangString OPT_PAGE_LABEL 2052 "附加快捷方式："

LangString OPT_DESKTOP 1033 "Create a &desktop shortcut"
LangString OPT_DESKTOP 1025 "إنشاء اختصار على المكتب"
LangString OPT_DESKTOP 1049 "Создать ярлык на &рабочем столе"
LangString OPT_DESKTOP 2052 "创建桌面快捷方式"

LangString OPT_STARTMENU 1033 "Add a &Start Menu shortcut"
LangString OPT_STARTMENU 1025 "إضافة اختصار في قائمة ابدأ"
LangString OPT_STARTMENU 1049 "Добавить ярлык в &меню Пуск"
LangString OPT_STARTMENU 2052 "添加到开始菜单"

LangString OPT_TASKBAR 1033 "&Pin RepoPrep to the taskbar"
LangString OPT_TASKBAR 1025 "تثبيت RepoPrep في شريط المهام"
LangString OPT_TASKBAR 1049 "За&крепить RepoPrep на панели задач"
LangString OPT_TASKBAR 2052 "固定到任务栏"

LangString OPT_PAGE_NOTE 1033 "You can change these later by running the installer again."
LangString OPT_PAGE_NOTE 1025 "يمكنك تغيير هذه الخيارات لاحقًا عن طريق إعادة تشغيل المثبّت."
LangString OPT_PAGE_NOTE 1049 "Вы сможете изменить эти параметры позже, перезапустив установщик."
LangString OPT_PAGE_NOTE 2052 "以后可以重新运行安装程序来更改这些选项。"

; ----------------------------------------------------------------------------
; Defensive fallbacks for defines that are normally provided by electron-builder
; (available in both the installer and uninstaller builds).
; ----------------------------------------------------------------------------
!ifndef SHORTCUT_NAME
  !ifdef PRODUCT_NAME
    !define /ifndef SHORTCUT_NAME "${PRODUCT_NAME}"
  !else
    !define /ifndef SHORTCUT_NAME "RepoPrep"
  !endif
!endif

!ifndef MENU_FILENAME
  !define /ifndef MENU_FILENAME "${SHORTCUT_NAME}"
!endif

; ----------------------------------------------------------------------------
; Custom options page (inserted via the customPageAfterChangeDir page hook).
; Three "yes/no" shortcuts, all checked by default.
; ----------------------------------------------------------------------------
!macro customPageAfterChangeDir
  Function pageOptionsPre
    ; First time the page is shown: everything on by default.
    ${If} $optDesktop == ""
      StrCpy $optDesktop "1"
    ${EndIf}
    ${If} $optStartMenu == ""
      StrCpy $optStartMenu "1"
    ${EndIf}
    ${If} $optTaskbar == ""
      StrCpy $optTaskbar "1"
    ${EndIf}

    !insertmacro MUI_HEADER_TEXT "$(OPT_PAGE_TITLE)" "$(OPT_PAGE_SUBTITLE)"

    nsDialogs::Create 1018
    Pop $R9
    ${If} $R9 == "error"
      Abort
    ${EndIf}

    ${NSD_CreateLabel} 0 6u 100% 18u "$(OPT_PAGE_LABEL)"
    Pop $0

    ${NSD_CreateCheckbox} 0 28u 100% 16u "$(OPT_DESKTOP)"
    Pop $optDesktopCtl
    ${If} $optDesktop == "1"
      ${NSD_Check} $optDesktopCtl
    ${EndIf}

    ${NSD_CreateCheckbox} 0 48u 100% 16u "$(OPT_STARTMENU)"
    Pop $optStartMenuCtl
    ${If} $optStartMenu == "1"
      ${NSD_Check} $optStartMenuCtl
    ${EndIf}

    ${NSD_CreateCheckbox} 0 68u 100% 16u "$(OPT_TASKBAR)"
    Pop $optTaskbarCtl
    ${If} $optTaskbar == "1"
      ${NSD_Check} $optTaskbarCtl
    ${EndIf}

    ${NSD_CreateLabel} 0 94u 100% 36u "$(OPT_PAGE_NOTE)"
    Pop $0

    nsDialogs::Show
  FunctionEnd

  Function pageOptionsLeave
    ${NSD_GetState} $optDesktopCtl $optDesktop
    ${NSD_GetState} $optStartMenuCtl $optStartMenu
    ${NSD_GetState} $optTaskbarCtl $optTaskbar
  FunctionEnd

  Page custom pageOptionsPre pageOptionsLeave
!macroend

; ----------------------------------------------------------------------------
; customInstall — executed inside the install section, after the app package is
; extracted. $newDesktopLink / $newStartMenuLink / $appExe are already set by
; the electron-builder install section at this point.
; ----------------------------------------------------------------------------
!macro customInstall
  ; 1. Desktop shortcut (options page; default ON).
  ${If} $optDesktop != "0"
    CreateShortCut "$newDesktopLink" "$appExe" "" "$appExe" 0
    ClearErrors
    WinShell::SetLnkAUMI "$newDesktopLink" "${APP_ID}"
  ${EndIf}

  ; 2. Start Menu shortcut (options page; default ON).
  ${If} $optStartMenu != "0"
    CreateDirectory "$SMPROGRAMS\${MENU_FILENAME}"
    CreateShortCut "$newStartMenuLink" "$appExe" "" "$appExe" 0
    ClearErrors
    WinShell::SetLnkAUMI "$newStartMenuLink" "${APP_ID}"
  ${EndIf}

  ; 3. Pin to taskbar (options page; default ON).
  ;    Best effort: Windows only offers the pin verb after an app has been
  ;    launched at least once, so this may be a no-op on brand-new installs.
  ${If} $optTaskbar != "0"
    nsExec::ExecToLog "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command $\"@(New-Object -ComObject Shell.Application).NameSpace('$INSTDIR').ParseName('${APP_EXECUTABLE_FILENAME}').InvokeVerb('taskbarpin')$\""
    Pop $0
  ${EndIf}

  ; 4. Windows Explorer context menu — "Open with RepoPrep" on folders.
  ;    Launches the app with the folder path as argv, the app auto-selects it.
  WriteRegStr HKCR "Directory\shell\RepoPrep" "" "Open with RepoPrep"
  WriteRegStr HKCR "Directory\shell\RepoPrep" "Icon" "$INSTDIR\${APP_EXECUTABLE_FILENAME},0"
  WriteRegStr HKCR "Directory\shell\RepoPrep\command" "" '"$INSTDIR\${APP_EXECUTABLE_FILENAME}" "%1"'

  ; Per-user copy (HKCU\Software\Classes is merged into HKCR at runtime).
  ; Guarantees the entry works even for per-user / non-elevated installs.
  WriteRegStr HKCU "Software\Classes\Directory\shell\RepoPrep" "" "Open with RepoPrep"
  WriteRegStr HKCU "Software\Classes\Directory\shell\RepoPrep" "Icon" "$INSTDIR\${APP_EXECUTABLE_FILENAME},0"
  WriteRegStr HKCU "Software\Classes\Directory\shell\RepoPrep\command" "" '"$INSTDIR\${APP_EXECUTABLE_FILENAME}" "%1"'

  ; 5. Persist the installer language so the app can adopt it on first launch.
  ;    Writes %APPDATA%\RepoPrep\config.json  →  {"lang": "<code>"}
  CreateDirectory "$APPDATA\RepoPrep"

  ; Map the NSIS UI language LCID to the app's i18n language code.
  ${If} $LANGUAGE = 1025       ; Arabic (Saudi Arabia)
    StrCpy $0 "ar"
  ${ElseIf} $LANGUAGE = 1049   ; Russian
    StrCpy $0 "ru"
  ${ElseIf} $LANGUAGE = 2052   ; Chinese (Simplified)
    StrCpy $0 "zh"
  ${ElseIf} $LANGUAGE = 1033   ; English (US)
    StrCpy $0 "en"
  ${Else}
    StrCpy $0 "en"
  ${EndIf}

  FileOpen $1 "$APPDATA\RepoPrep\config.json" w
  FileSeek $1 0 SET
  FileWrite $1 '{$\r$\n  "lang": "$0"$\r$\n}$\r$\n'
  FileClose $1
!macroend

; ----------------------------------------------------------------------------
; customUnInstall — executed inside the uninstall section.
; ----------------------------------------------------------------------------
!macro customUnInstall
  ; 1. Remove shortcuts created by customInstall (both all-users and the
  ;    installing user, whichever matches). Folders are removed only when
  ;    empty, so other apps' shortcuts are never deleted.
  SetShellVarContext all
  Delete "$DESKTOP\${SHORTCUT_NAME}.lnk"
  !ifdef MENU_FILENAME
    Delete "$SMPROGRAMS\${MENU_FILENAME}\${SHORTCUT_NAME}.lnk"
    RMDir "$SMPROGRAMS\${MENU_FILENAME}"
  !else
    Delete "$SMPROGRAMS\${SHORTCUT_NAME}.lnk"
  !endif

  SetShellVarContext current
  Delete "$DESKTOP\${SHORTCUT_NAME}.lnk"
  !ifdef MENU_FILENAME
    Delete "$SMPROGRAMS\${MENU_FILENAME}\${SHORTCUT_NAME}.lnk"
    RMDir "$SMPROGRAMS\${MENU_FILENAME}"
  !else
    Delete "$SMPROGRAMS\${SHORTCUT_NAME}.lnk"
  !endif

  ; 2. Attempt to unpin from the taskbar.
  nsExec::ExecToStack "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command $\"@(New-Object -ComObject Shell.Application).NameSpace('$INSTDIR').ParseName('${APP_EXECUTABLE_FILENAME}').InvokeVerb('taskbarunpin')$\""
  Pop $0

  ; 3. Remove the Explorer context-menu entries (both all-users + per-user).
  DeleteRegKey HKCR "Directory\shell\RepoPrep"
  DeleteRegKey HKCU "Software\Classes\Directory\shell\RepoPrep"

  ; 4. Remove the Windows auto-start (Run key) written by
  ;    app.setLoginItemSettings. Value name = Electron app name.
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "RepoPrep Pro"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "RepoPrep"
  DeleteRegValue HKLM "Software\Microsoft\Windows\CurrentVersion\Run" "RepoPrep Pro"
  DeleteRegValue HKLM "Software\Microsoft\Windows\CurrentVersion\Run" "RepoPrep"

  ; 5. Drop the installer-persisted language config (keeps window-state etc.).
  Delete "$APPDATA\RepoPrep\config.json"
!macroend