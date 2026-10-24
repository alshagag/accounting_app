"use client";
import React from "react";
import Select from 'react-select';

const AppSelect = ({
  className,
  placeholder,
  initialOptions = [],
  value,
  onChange,
  isClearable = true,
  ...props
}) => {
  const customStyles = {
    control: (provided, state) => ({
      ...provided,
      minHeight: '38px',
      height: '38px',
      boxShadow: state.isFocused ? '0 0 0 0.25rem rgba(13, 110, 253, 0.25)' : 0,
      borderColor: state.isFocused ? '#86b7fe' : '#ced4da',
      '&:hover': {
        borderColor: state.isFocused ? '#86b7fe' : '#b1c9e3',
      },
      // جعل الحقل متجاوبًا ليتسع لعرض الحاوية | Make the control responsive so it grows to the container width
      width: '100%',
    }),
    valueContainer: (provided) => ({
      ...provided,
      height: '38px',
      padding: '0 8px',
    }),
    input: (provided) => ({ ...provided, margin: '0px' }),
    indicatorsContainer: (provided) => ({
      ...provided,
      height: '38px',
    }),
    menu: (provided, state) => {
      const mw = state.selectProps && state.selectProps.menuPortalWidth ? state.selectProps.menuPortalWidth : undefined;
      return {
        ...provided,
        zIndex: 9999,
        // عرض البوابة يحدد العرض وإلا فاتركه تلقائيًا | The portal width controls the width, otherwise leave it auto
        minWidth: mw || provided.minWidth || '12rem',
        maxWidth: '90vw',
      };
    }, // ضمان ظهور القائمة فوق العناصر الأخرى وبشكل متجاوب | Ensure the menu appears above other elements and is responsive
    menuPortal: (base, state) => {
      // يثبّت react-select القائمة بـ left الفيزيائي (rect.left) الذي يشير إلى حافة الحقل اليسرى حتى في RTL؛ نعيد التموضع من الحافة اليمنى: right = عرض النافذة − control.right | react-select anchors the menu with physical left (rect.left), which points at the control's LEFT edge even in RTL; reposition from the RIGHT edge instead: right = viewportWidth − control.right
      const vw = typeof window !== 'undefined' ? window.innerWidth : 0;
      const leftPx = Number.isFinite(base.left) ? base.left : 0;
      const widthPx = Number.isFinite(base.width) ? base.width : 0;
      const rightPx = Math.max(0, vw - leftPx - widthPx);
      return {
        ...base,
        left: 'auto',
        right: rightPx,
        zIndex: 9999,
        width: state.selectProps && state.selectProps.menuPortalWidth ? state.selectProps.menuPortalWidth + 'px' : 'auto',
        maxWidth: '95vw'
      };
    },
  };

  return (
    <Select
      dir="rtl"
      className={`react-select-container ${className || ""}`}
      classNamePrefix="react-select"
      styles={customStyles}
      options={initialOptions}
      value={value}
      onChange={onChange}
      placeholder={placeholder || ""}
      isClearable={isClearable}
      isSearchable={true}
      menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
      menuPosition="fixed"
      noOptionsMessage={() => "لا توجد خيارات"}
      {...props}
    />
  );
};

export default AppSelect;
