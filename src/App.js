import React from 'react'
import {
    BrowserRouter as Router,
    Route,
    Switch
} from 'react-router-dom'

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

import Login from './views/Login'
import Index from './views/Index'
import Home from './views/Home'
import AddClaim from './views/AddClaim'
import Dashboard from './views/Dashboard'

// =============
// App structure
// =============

const App = () => {
    return(
        // All elements wrapped in these <Router> tags will have access to the declared routes
        <Router>
            <Switch>
              <Route exact path="/" component={Index}/>
              <Route path="/login" component={Login}/>
              <Route path="/home" component={Home}/>
              <Route path="/dashboard" component={Dashboard}/>
              <Route path="/addClaim" component={AddClaim}/>
            </Switch>
        </Router>
    )
}

export default App