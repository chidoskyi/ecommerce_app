function generateGuestId() {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    return `guest-${timestamp}-${randomString}`;
  }
  
  console.log(generateGuestId());
  