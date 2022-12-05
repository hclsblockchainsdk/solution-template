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

import NodeRSA from 'node-rsa'

export function sign(id, path, payload) {
    const signkeyPEM = "-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEAlDTOPlO+GE+RGrO0XHjGlazX3kc5lLfzfETuinjPZ2sPDQIKCLGisrcxKKPLmWApUj8CV0lOUo6huDkg5M24ELLzXwl72+JGwE1LYVkvdiVktQcjEogc5IN1iaS47FvYE6xISou4W/ZnN6oSiCnU/tpwE5B9BLyX9AUiXpInbr9LPla1QRPQFqbolLYOkDr6zhBhBaEqDMsy4/7KUFC82iHGMg9yi+zRH3vRD2mdFHHaiEpq4Wn88PrSX2mLQ0FySeZF1DxNkumgG3Z7Y0NicCqeow6jv9hbzRnUHF1oAVKVEuUjlHBbjQsQKFb+Y3iRvXIS4AtR6xQ0A0gBCtX3+QIDAQABAoIBAQCLD6U5fDAQ9Y+Mg3PHlJeY125RpXkU3yl6v98nVMYfHqgnp3MsxyiHEjbxEAe46S68elzC9AimlCiQCCKiLZj5KkALO4XZQs7qH1yMgjdzXxDIf2LcP5UEoYjG1yWguWjcxLmsIL+iomglJdJvqvitDN8+rENyD1dw4uRl4jNXyH7IA03kCayxa0Iyu39JLDF9UShi4xYM1kbcWBRaO1FHCZzouKdvICpe/9/Z2uqDp2PHBVeoyFKR2jhhKukBh+SKqioPl51+V+HMDjMVwDKnA7vgsMkfHrXGWAq62SW1aIKscQ63PE+/tCTeZ28mxBRbsiOap/XjYrVKasVpTjrRAoGBAMXeBCiucUaVSqR0kCSZ8IcFggxI6IJqc3ew3r+xr5zpCP4AD2GkP7u3qKW/HgBQkEOibBSVFcfGAYOk/X5GwUtVLbBg9mQDp9qkSc6M6hYfKnRoIA83RGL8n/DfjJq4YgGVgXP4w63J7XwQH116dkJT+PIwwM76Z08VUGZS8u+FAoGBAL+/sJj5IbMLSZeXU2MZwhvaXOiATxeL2BWT1nswGvNtv4FNCG3TZB+nhNdv6BR8CQZDPMpQcS91pddQHNF/kS7Z2X+KgSCod4lxS9fwFXJWPphKtQ48vF3fb1ApJUbWCbdzXacsKHnoJpSyKqRAl0GWXZ3oH33+Mt8npGbgDb7lAoGAGzoTpG1slOPSI5MOiprMKCgv3vThWaDARsYFwKb4nUTLwffMJglt46y//h6wSCbN0yC0cpiZKKYsayr23rtpua383XpaLST7ofBdX5iwVV7wfpgdYTqfpGdSsthwBpI8mi8yYvzmIDHbBelKB5jkUPgxF1JyFYkLUiyCpbHgT+kCgYBheG2qtSl+PASivFe1DojvY6bKwT5zN7EV9tqWMDPi/izU63WXbld9B8itQsN0dkCYIGGsbgu7FlDBDIY5sGD6sd6vyJYvJbPt99uX3wDn6BNVktRKcnFGPqf01ZWPVooF6Oz4Z6gDoBDMkWy/pd29h1P7St2HTEpLyXj2mnoiSQKBgGm5mv3Bg0qAP/Pf03eorbezIpy91PuUldnTbyAsT47cc+d8lpdYe6EKxVt6utJip1YQQ/yNqzINDvzXdRHeeA1OZPfJGR/dtl11nk59hoSCqUmy2YZzYIAIm9nQzVEFkHS9JtyTtIYGgidPaOWozI7Spft7RjpMwae2D9xlpf4k\n-----END RSA PRIVATE KEY-----\n";
    
    const signkey = new NodeRSA(signkeyPEM);
    //compute signature with signkey
    var message =id+path+payload;
    let signature = signkey.sign(message, 'base64');
    console.log("signature:"+signature);
    return signature+":solution-ui";
}
