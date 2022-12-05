/*******************************************************************************
 * IBM Confidential
 * 
 * OCO Source Materials
 * 
 * Copyright IBM Corp. 2019, 2020
 * 
 * The source code for this program is not published or otherwise
 * divested of its trade secrets, irrespective of what has been
 * deposited with the U.S. Copyright Office.
 *******************************************************************************/

import React from 'react'

export const ErrorMsg = ({id}) => {
    const hide = () => {
        document.getElementById("addClaimError").classList.add("hidden")
    }
    return(
        <div className="errorMsg hidden" id={id}>
            <div id="errorMsgSymbol"/>
            <span className="semiBold" id={id + "-msg"}>Error in form: </span><span className="gray" id={id + "-msgDetail"}>Please fill out the required fields</span>
            <div id="messageX" onClick={hide}/>
        </div>
    )
}

export const SuccessMsg = ({id}) => {
    const hide = () => {
        document.getElementById("addClaimSuccess").classList.add("hidden")
    }
    return(
        <div className="successMsg hidden" id={id}>
            <div id="successMsgSymbol"/>
            <span className="semiBold" id={id + "-msg"}></span><span className="gray" id={id + "-msgDetail"}></span>
            <div id="messageX" onClick={hide}/>
        </div>
    )
}

export const InputError = ({id, text, type}) => {
    var classes = "inputError hidden " + type
    return(
        <div className={classes} id={id}><span class='red'>*</span>{text}</div>
    )
}