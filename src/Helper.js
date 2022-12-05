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

export function getDate(dateNumber) {
    if (dateNumber === 0) {
        return "";
    }
    var full_date = new Date(dateNumber*1000);

    const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

    return full_date.getDate()+" "+monthNames[full_date.getMonth()]+" "+full_date.getFullYear();
}

export function logout() {
    localStorage.removeItem("username")
    sessionStorage.removeItem("username")
    localStorage.removeItem("token")
    sessionStorage.removeItem("token")
    this.props.history.push("/");
}
