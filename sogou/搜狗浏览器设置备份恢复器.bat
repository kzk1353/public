@echo off&title 搜狗浏览器设置备份恢复器[-☆Ver:1.0 By deniss-]
color 03
Rem 搜狗浏览器设置备份恢复器
:choices
cls
echo     ╔…………………………………╗
echo    -｜ 搜狗浏览器设置备份恢复器 ｜-------------------------------------------
echo   ｜╚…………………………………╝                                            ｜
echo   ｜                                                                        ｜
echo   ｜ ◎ 1. 导出搜狗浏览器设置                                               ｜
echo   ｜                                                                        ｜
echo   ｜ ◎ 2. 恢复搜狗浏览器设置                                               ｜
echo   ｜                                                                        ｜
echo   ｜ ◎                                                                     ｜
echo   ｜                                                                        ｜
echo   ｜                                                                        ｜
echo   ｜                                                                        ｜
echo   ｜                                                       E  退出          ｜
echo   ｜                                                                        ｜
echo    --------------------------------------------------------------------------
echo.
echo.
Set /p choices=请您选择要进行的操作("1" or "2" or "其它"),然后回车:
If "%choices%"=="" Goto choices
If "%choices%"=="1" Goto choices1
If "%choices%"=="2" Goto choices2
If /i "%choices%"=="E" Exit

REM 导出搜狗浏览器设置
:choices1
echo.
echo.
echo.
echo ≡≡≡≡≡≡≡≡≡≡≡≡≡≡≡≡≡≡
echo +正在导出搜狗浏览器设置.......
echo ≡≡≡≡≡≡≡≡≡≡≡≡≡≡≡≡≡≡
cd %~dp0
echo.
echo 正在复制文件到本批处理所在目录搜狗浏览器设置备份文件夹......OK!
echo.
xcopy /h /r /k /y "%appdata%\SogouExplorer\config.xml" 本地设置备份
echo.
echo.
echo ﹕﹕﹕﹕﹕﹕﹕﹕﹕﹕﹕﹕﹕﹕﹕﹕﹕﹕﹕﹕﹕﹕﹕﹕﹕﹕﹕﹕
echo 已完成搜狗浏览器设置备份!
echo.
echo 请按任意键退出
pause>nul
goto exit

REM 恢复搜狗浏览器设置
:choices2
echo ≡≡≡≡≡≡≡≡≡≡≡≡≡≡≡≡≡≡
echo +正在恢复搜狗浏览器设置.......
echo ≡≡≡≡≡≡≡≡≡≡≡≡≡≡≡≡≡≡
cd %~dp0
echo.
xcopy /h /r /k /y 本地设置备份\config.xml "%appdata%\SogouExplorer\"
echo.
echo 正在恢复搜狗浏览器设置......OK!
echo.
echo.
echo ﹕﹕﹕﹕﹕﹕﹕﹕﹕﹕﹕﹕﹕﹕﹕﹕﹕﹕﹕﹕﹕﹕﹕﹕﹕﹕﹕﹕
echo 已成功恢复搜狗浏览器设置!
echo.
echo 请按任意键退出
pause>nul
goto exit