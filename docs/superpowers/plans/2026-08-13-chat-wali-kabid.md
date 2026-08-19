    params.set("teacher_id", selectedTeacherId);
            }
            const url = `/api/admin/pengajar-pdf${params.toString() ? `?${params.toString()}` : ""}`;
            const res = await fetch(url);
            if (!res.ok) {
                const json = await res.json().catch(()=>({}));
                throw new Error(json.message || "Gagal mengunduh PDF");
            }
            const blob = await res.blob();
            const downloadUrl = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = downloadUrl;
            const date = new Date().toISOString().slice(0, 10);
            const teacherName = selectedTeacherId ? stats.find((t)=>t.id === selectedTeacherId)?.name?.replace(/\s+/g, "_") || "pengajar" : "semua-pengajar";
            a.download = `data-pengajar-siswa-${teacherName}-${date}.pdf`;
            a.click();
            URL.revokeObjectURL(downloadUrl);
            toast.success("PDF data pengajar & siswa berhasil diunduh.");
        } catch (err) {
            console.error("Gagal download PDF:", err);
            toast.error("Gagal mengunduh PDF. Coba lagi.");
        } finally{
            setDownloading(false);
        }
    };
    return /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("div", {
        className: "space-y-6",
        children: [
            /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("div", {
                className: "flex flex-col sm:flex-row sm:items-center justify-between gap-4",
                children: [
                    /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("div", {
                        children: [
                            /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx("h1", {
                                className: "text-2xl font-bold text-slate-900 tracking-tight",
                                children: "Data Pengajar & Siswa"
                            }),
                            /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx("p", {
                                className: "text-sm text-slate-500 mt-0.5",
                                children: "Pilih pengajar untuk mengunduh data siswa yang diajarkan beserta barcode."
                            })
                        ]
                    }),
                    /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("div", {
                        className: "flex items-center gap-2 flex-wrap",
                        children: [
                            /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("select", {
                                value: selectedTeacherId,
                                onChange: (e)=>setSelectedTeacherId(e.target.value),
                                disabled: downloading || loadingStats,
                                className: "rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white",
                                children: [
                                    /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx("option", {
                                        value: "",
                                        children: "Semua Pengajar"
                                    }),
                                    stats.map((teacher)=>/*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("option", {
                                            value: teacher.id,
                                            children: [
                                                teacher.name,
                                                teacher.classNames?.length ? ` (${teacher.classNames.join(", ")})` : "",
                                                " (",
                                                teacher.studentCount,
                                                " siswa)"
                                            ]
                                        }, teacher.id))
                                ]
                            }),
                            /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_components_ui_Button__WEBPACK_IMPORTED_MODULE_2__/* ["default"] */ .Z, {
                                variant: "primary",
                                leftIcon: downloading ? /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_barrel_optimize_names_Download_Loader2_lucide_react__WEBPACK_IMPORTED_MODULE_4__/* ["default"] */ .Z, {
                                    size: 15,
                                    className: "animate-spin"
                                }) : /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_barrel_optimize_names_Download_Loader2_lucide_react__WEBPACK_IMPORTED_MODULE_5__/* ["default"] */ .Z, {
                                    size: 15
                                }),
                                onClick: handleDownload,
                                loading: downloading,
                                disabled: loadingStats,
                                children: "Download PDF"
                            })
                        ]
                    })
                ]
            }),
            /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("div", {
                className: "bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden",
                children: [
                    /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx("div", {
                        className: "px-4 py-3 border-b border-slate-200 bg-slate-50",
                        children: /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx("h2", {
                            className: "text-sm font-semibold text-slate-700",
                            children: "Ringkasan Pengajar"
                        })
                    }),
                    /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx("div", {
                        className: "overflow-x-auto",
                        children: /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("table", {
                            className: "w-full",
                            children: [
                                /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx("thead", {
                                    children: /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("tr", {
                                        className: "bg-slate-50 border-b border-slate-200",
                                        children: [
                                            /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx("th", {
                                                className: "px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider",
                                                children: "Nama Pengajar"
                                            }),
                                            /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx("th", {
                                                className: "px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider",
                                                children: "Role"
                                            }),
                                            /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx("th", {
                                                className: "px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider",
                                                children: "Email"
                                            }),
                                            /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx("th", {
                                                className: "px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider",
                                                children: "Nama Kelas"
                                            }),
                                            /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx("th", {
                                                className: "px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider",
                                                children: "Jumlah Siswa"
                                            })
                                        ]
                                    })
                                }),
                                /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx("tbody", {
                                    className: "divide-y divide-slate-100",
                                    children: loadingStats ? Array.from({
                                        length: 3
                                    }).map((_, i)=>/*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("tr", {
                                            children: [
                                                /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx("td", {
                                                    className: "px-4 py-3",
                                                    children: /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx("div", {
                                                        className: "h-5 bg-slate-200 rounded animate-pulse w-32"
                                                    })
                                                }),
                                                /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx("td", {
                                                    className: "px-4 py-3",
                                                    children: /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx("div", {
                                                        className: "h-5 bg-slate-200 rounded animate-pulse w-20"
                                                    })
                                                }),
                                                /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx("td", {
                                                    className: "px-4 py-3",
                                                    children: /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx("div", {
                                                        className: "h-5 bg-slate-200 rounded animate-pulse w-40"
                                                    })
                                                }),
                                                /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx("td", {
                                                    className: "px-4 py-3",
                                                    children: /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx("div", {
                                                        className: "h-5 bg-slate-200 rounded animate-pulse w-36"
                                                    })
                                                }),
                                                /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx("td", {
                                                    className: "px-4 py-3",
                                                    children: /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx("div", {
                                                        className: "h-5 bg-slate-200 rounded animate-pulse w-16 ml-auto"
                                                    })
                                                })
                                            ]
                                        }, i)) : stats.length === 0 ? /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx("tr", {
                                        children: /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx("td", {
                                            colSpan: 5,
                                            className: "px-4 py-8 text-center text-sm text-slate-500",
                                            children: "Belum ada data pengajar."
                                        })
                                    }) : stats.map((teacher)=>/*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("tr", {
                                            className: "hover:bg-slate-50 transition-colors",
                                            children: [
                                                /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx("td", {
                                                    className: "px-4 py-3",
                                                    children: /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx("span", {
                                                        className: "text-sm font-medium text-slate-800",
                                                        children: teacher.name
                                                    })
                                                }),
                                                /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx("td", {
                                                    className: "px-4 py-3",
                                                    children: /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx("span", {
                                                        className: "text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200",
                                                        children: teacher.role
                                                    })
                                                }),
                                                /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx("td", {
                                                    className: "px-4 py-3",
                                                    children: /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx("span", {
                                                        className: "text-sm text-slate-600",
                                                        children: teacher.email || "â€”"
                                                    })
                                                }),
                                                /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx("td", {
                                                    className: "px-4 py-3",
                                                    children: teacher.classNames && teacher.classNames.length > 0 ? /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx("div", {
                                                        className: "flex flex-wrap gap-1",
                                                        children: teacher.classNames.map((cls, idx)=>/*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx("span", {
                                                                className: "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200",
                                                                children: cls
                                                            }, idx))
                                                    }) : /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx("span", {
                                                        className: "text-sm text-slate-400",
                                                        children: "â€”"
                                                    })
                                                }),
                                                /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx("td", {
                                                    className: "px-4 py-3 text-right",
                                                    children: /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("span", {
                                                        className: "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700",
                                                        children: [
                                                            teacher.studentCount,
                                                            " siswa"
                                                        ]
                                                    })
                                                })
                                            ]
                                        }, teacher.id))
                                })
                            ]
                        })
                    })
                ]
            })
        ]
    });
}


/***/ }),

/***/ 99837:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Z: () => (/* binding */ Button)
/* harmony export */ });
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(10326);
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(17577);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _barrel_optimize_names_Loader2_lucide_react__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(80361);
/* __next_internal_client_entry_do_not_use__ default auto */ 
// src/components/ui/Button.tsx
// Button komponen dengan variant, size, dan loading state.


const variantClasses = {
    primary: "bg-amber-600 text-white hover:bg-amber-700 focus-visible:ring-amber-500 border border-transparent disabled:bg-amber-300",
    secondary: "bg-white text-amber-700 hover:bg-amber-50 focus-visible:ring-amber-500 border border-amber-300 disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-200",
    danger: "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500 border border-transparent disabled:bg-red-300",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100 focus-visible:ring-slate-400 border border-transparent disabled:text-slate-300"
};
const sizeClasses = {
    sm: "px-3 py-2 text-sm gap-1.5 min-h-[40px]",
    md: "px-4 py-2.5 text-base gap-2 min-h-[44px]",
    lg: "px-5 py-3 text-base gap-2 min-h-[48px]"
};
function Button({ variant = "primary", size = "md", loading = false, leftIcon, rightIcon, children, disabled, className = "", ...props }) {
    const isDisabled = disabled || loading;
    return /*#__PURE__*/ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxs)("button", {
        disabled: isDisabled,
        className: [
            "inline-flex items-center justify-center font-medium rounded-lg transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed",
            variantClasses[variant],
            sizeClasses[size],
            className
        ].join(" "),
        ...props,
        children: [
            loading ? /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx(_barrel_optimize_names_Loader2_lucide_react__WEBPACK_IMPORTED_MODULE_2__/* ["default"] */ .Z, {
                size: size === "lg" ? 18 : 16,
                className: "animate-spin shrink-0"
            }) : leftIcon && /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx("span", {
                className: "shrink-0",
                children: leftIcon
            }),
            children && /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx("span", {
                children: children
            }),
            !loading && rightIcon && /*#__PURE__*/ react_jsx_runtime__WEBPACK_IMPORTED_MODULE_0__.jsx("span", {
                className: "shrink-0",
                children: rightIcon
            })
        ]
    });
}


/***/ }),

/***/ 71696:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__),
/* harmony export */   dynamic: () => (/* binding */ e0)
/* harmony export */ });
/* harmony import */ var next_dist_build_webpack_loaders_next_flight_loader_module_proxy__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(68570);


const e0 = (0,next_dist_build_webpack_loaders_next_flight_loader_module_proxy__WEBPACK_IMPORTED_MODULE_0__.createProxy)(String.raw`F:\Instalasi linux\tim-quran Vps update\src\app\(dashboard)\admin\pengajar-pdf\page.tsx#dynamic`);
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ((0,next_dist_build_webpack_loaders_next_flight_loader_module_proxy__WEBPACK_IMPORTED_MODULE_0__.createProxy)(String.raw`F:\Instalasi linux\tim-quran Vps update\src\app\(dashboard)\admin\pengajar-pdf\page.tsx#default`));


/***/ }),

/***/ 39914:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Z: () => (/* binding */ Download)
/* harmony export */ });
/* unused harmony export __iconNode */
/* harmony import */ var _createLucideIcon_mjs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(52761);
/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ 
const __iconNode = [
    [
        "path",
        {
            d: "M12 15V3",
            key: "m9g1x1"
        }
    ],
    [
        "path",
        {
            d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",
            key: "ih7n3h"
        }
    ],
    [
        "path",
        {
            d: "m7 10 5 5 5-5",
            key: "brsn70"
        }
    ]
];
const Download = (0,_createLucideIcon_mjs__WEBPACK_IMPORTED_MODULE_0__/* ["default"] */ .Z)("download", __iconNode);
 //# sourceMappingURL=download.mjs.map


/***/ }),

/***/ 80361:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Z: () => (/* binding */ LoaderCircle)
/* harmony export */ });
/* unused harmony export __iconNode */
/* harmony import */ var _createLucideIcon_mjs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(52761);
/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */ 
const __iconNode = [
    [
        "path",
        {
            d: "M21 12a9 9 0 1 1-6.219-8.56",
            key: "13zald"
        }
    ]
];
const LoaderCircle = (0,_createLucideIcon_mjs__WEBPACK_IMPORTED_MODULE_0__/* ["default"] */ .Z)("loader-circle", __iconNode);
 //# sourceMappingURL=loader-circle.mjs.map


/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../../../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, [8948,9802,1615,8691,2857,3830,3542,1080,796,4160], () => (__webpack_exec__(15771)));
module.exports = __webpack_exports__;

})();&FÚúÿ#²¦ÿÿ"@Á   ³¦ÿÿf   (() => {
var exports = {};
exports.id 